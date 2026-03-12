import { SQL } from "bun";

import {
  parseJson,
  parseJsonArrayItems,
  parseNullableNumber,
  toGreptimeDatetime,
} from "./greptime";

const greptimeDb = new SQL({
  url: process.env.GREPTIME_PG_URL ?? "postgres://localhost:4003/public",
});

const METADATA_PREFIX = "span_attributes.gen_ai.request.metadata.";

function extractSummary(outputMessages: unknown): string {
  const message = parseJson(outputMessages);
  const parts =
    message && typeof message === "object" && Array.isArray((message as { parts?: unknown }).parts)
      ? ((message as { parts: unknown[] }).parts ?? [])
      : [];

  const content = parts
    .map((part) => (part && typeof part === "object" ? (part as Record<string, unknown>) : null))
    .filter((part) => part?.type === "text" && typeof part.content === "string")
    .map((part) => String(part?.content))
    .join(" ");

  return content.slice(0, 200) + (content.length > 200 ? "..." : "");
}

export type ListTracesOpts = {
  organizationId: string;
  agentSlug: string;
  branchSlug: string;
  from: Date;
  to: Date;
  page: number;
  pageSize: number;
  metadataFilters: Record<string, string>;
};

export async function listTraces(opts: ListTracesOpts) {
  const { organizationId, agentSlug, branchSlug, from, to, page, pageSize, metadataFilters } = opts;
  const offset = (page - 1) * pageSize;

  // Build dynamic metadata filter clauses
  const metaKeys = Object.keys(metadataFilters);
  let metaFilterSql = "";
  const metaValues: string[] = [];
  for (const key of metaKeys) {
    metaFilterSql += ` AND "${METADATA_PREFIX}${key}" = $${metaValues.length + 6}`;
    metaValues.push(metadataFilters[key]!);
  }

  // We need to use raw SQL since Bun.SQL tagged templates don't support dynamic column names
  const queryText = `
    SELECT
      "timestamp",
      trace_id,
      span_id,
      span_name,
      span_status_code,
      duration_nano,
      "span_attributes.gen_ai.operation.name" AS operation_name,
      "span_attributes.gen_ai.response.model" AS response_model,
      "span_attributes.gen_ai.provider.name" AS provider_name,
      json_get_string("span_attributes.gen_ai.output.messages", '$[last - 0]') AS output_message
    FROM opentelemetry_traces
    WHERE "span_attributes.gen_ai.operation.name" IS NOT NULL
      AND "span_attributes.hebo.agent.slug" = $1
      AND "span_attributes.hebo.branch.slug" = $2
      AND "span_attributes.hebo.organization.id" = $3
      AND "timestamp" >= $4
      AND "timestamp" <= $5
      ${metaFilterSql}
    ORDER BY "timestamp" DESC
    LIMIT ${pageSize} OFFSET ${offset}
  `;

  const countText = `
    SELECT COUNT(*) AS cnt
    FROM opentelemetry_traces
    WHERE "span_attributes.gen_ai.operation.name" IS NOT NULL
      AND "span_attributes.hebo.agent.slug" = $1
      AND "span_attributes.hebo.branch.slug" = $2
      AND "span_attributes.hebo.organization.id" = $3
      AND "timestamp" >= $4
      AND "timestamp" <= $5
      ${metaFilterSql}
  `;

  const params = [
    agentSlug,
    branchSlug,
    organizationId,
    toGreptimeDatetime(from),
    toGreptimeDatetime(to),
    ...metaValues,
  ];

  const [rows, countRows] = await Promise.all([
    greptimeDb.unsafe(queryText, params),
    greptimeDb.unsafe(countText, params),
  ]);

  const total = Number(countRows[0]?.cnt ?? 0);

  const data = (rows as any[]).map((row) => {
    return {
      timestamp: String(row.timestamp),
      traceId: String(row.trace_id ?? ""),
      spanId: String(row.span_id ?? ""),
      operationName: String(row.operation_name ?? ""),
      model: String(row.response_model ?? ""),
      provider: String(row.provider_name ?? ""),
      status: formatStatus(row.span_status_code),
      durationMs: Number(row.duration_nano ?? 0) / 1e6,
      summary: extractSummary(row.output_message),
    };
  });

  return { data, total, page, pageSize };
}

export async function getTrace(
  organizationId: string,
  agentSlug: string,
  branchSlug: string,
  traceId: string,
) {
  const queryText = `
    SELECT
      "timestamp",
      "timestamp_end",
      trace_id,
      span_id,
      span_name,
      span_status_code,
      span_status_message,
      duration_nano,
      "span_attributes.gen_ai.operation.name" AS operation_name,
      "span_attributes.gen_ai.request.model" AS request_model,
      "span_attributes.gen_ai.response.model" AS response_model,
      "span_attributes.gen_ai.provider.name" AS provider_name,
      json_to_string("span_attributes.gen_ai.input.messages") AS input_messages,
      json_to_string("span_attributes.gen_ai.output.messages") AS output_messages,
      json_to_string("span_attributes.gen_ai.response.finish_reasons") AS finish_reasons,
      "span_attributes.gen_ai.response.id" AS response_id,
      "span_attributes.gen_ai.usage.input_tokens" AS input_tokens,
      "span_attributes.gen_ai.usage.output_tokens" AS output_tokens,
      "span_attributes.gen_ai.usage.total_tokens" AS total_tokens,
      "span_attributes.gen_ai.usage.reasoning.output_tokens" AS reasoning_tokens,
      "span_attributes.hebo.agent.slug",
      "span_attributes.hebo.branch.slug",
      "span_attributes.hebo.organization.id"
    FROM opentelemetry_traces
    WHERE trace_id = $1
      AND "span_attributes.hebo.organization.id" = $2
      AND "span_attributes.hebo.agent.slug" = $3
      AND "span_attributes.hebo.branch.slug" = $4
      AND "span_attributes.gen_ai.operation.name" IS NOT NULL
    LIMIT 1
  `;

  const rows = await greptimeDb.unsafe(queryText, [traceId, organizationId, agentSlug, branchSlug]);
  const row = (rows as any[])[0];
  if (!row) return null;

  // Extract all columns into spanAttributes and resourceAttributes maps
  const spanAttributes: Record<string, unknown> = {};
  const resourceAttributes: Record<string, unknown> = {};
  const metadata: Record<string, string> = {};

  for (const [key, value] of Object.entries(row)) {
    if (value === null || value === undefined) continue;
    if (key.startsWith("span_attributes.")) {
      spanAttributes[key.replace("span_attributes.", "")] = value;
      if (key.startsWith(METADATA_PREFIX)) {
        metadata[key.replace(METADATA_PREFIX, "")] = String(value);
      }
    } else if (key.startsWith("resource_attributes.")) {
      resourceAttributes[key.replace("resource_attributes.", "")] = value;
    }
  }

  return {
    timestamp: String(row.timestamp),
    timestampEnd: String(row.timestamp_end ?? ""),
    traceId: String(row.trace_id ?? ""),
    spanId: String(row.span_id ?? ""),
    spanName: String(row.span_name ?? ""),
    operationName: String(row.operation_name ?? ""),
    model: String(row.request_model ?? ""),
    responseModel: String(row.response_model ?? ""),
    provider: String(row.provider_name ?? ""),
    status: formatStatus(row.span_status_code),
    statusMessage: String(row.span_status_message ?? ""),
    durationMs: Number(row.duration_nano ?? 0) / 1e6,
    inputTokens: parseNullableNumber(row.input_tokens),
    outputTokens: parseNullableNumber(row.output_tokens),
    totalTokens: parseNullableNumber(row.total_tokens),
    reasoningTokens: parseNullableNumber(row.reasoning_tokens),
    inputMessages: parseJsonArrayItems(row.input_messages),
    outputMessages: parseJsonArrayItems(row.output_messages),
    finishReasons: parseJsonArrayItems(row.finish_reasons),
    responseId: String(row.response_id ?? ""),
    metadata,
    spanAttributes,
    resourceAttributes,
  };
}

export async function getMetadataTags(
  organizationId: string,
  agentSlug: string,
  branchSlug: string,
  from: Date,
  to: Date,
) {
  // Step 1: Get metadata column names from information_schema
  const colRows = await greptimeDb.unsafe(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'opentelemetry_traces'
       AND column_name LIKE $1`,
    [`${METADATA_PREFIX}%`],
  );

  const keys = (colRows as any[]).map((r) => String(r.column_name));
  if (keys.length === 0) return { tags: {} };

  // Step 2: For each key, get distinct values (capped at 50)
  const tags: Record<string, string[]> = {};

  await Promise.all(
    keys.map(async (colName) => {
      const keyName = colName.replace(METADATA_PREFIX, "");
      const valRows = await greptimeDb.unsafe(
        `SELECT DISTINCT "${colName}" AS val
         FROM opentelemetry_traces
         WHERE "span_attributes.gen_ai.operation.name" IS NOT NULL
           AND "span_attributes.hebo.agent.slug" = $1
           AND "span_attributes.hebo.branch.slug" = $2
           AND "span_attributes.hebo.organization.id" = $3
           AND "timestamp" >= $4
           AND "timestamp" <= $5
           AND "${colName}" IS NOT NULL
         LIMIT 50`,
        [agentSlug, branchSlug, organizationId, toGreptimeDatetime(from), toGreptimeDatetime(to)],
      );
      tags[keyName] = (valRows as any[]).map((r) => String(r.val));
    }),
  );

  return { tags };
}

function formatStatus(statusCode: string | null): string {
  if (!statusCode) return "unknown";
  if (statusCode === "STATUS_CODE_OK" || statusCode === "STATUS_CODE_UNSET") return "ok";
  if (statusCode === "STATUS_CODE_ERROR") return "error";
  return statusCode.replace("STATUS_CODE_", "").toLowerCase();
}
