import type { GreptimeDb } from "~api/middleware/greptime";

import type { SpanFinishReasons, SpanMessages } from "./types";
import {
  escapeSqlIdentifier,
  extractSummary,
  formatStatus,
  parseJsonArray,
  parseNullableNumber,
} from "./utils";

const MAX_ROWS = 10_000;
const MAX_VALUES_PER_KEY = 100;

const METADATA_PREFIX = "span_attributes.gen_ai.request.metadata.";

async function getMetadataColumnNames(greptimeDb: GreptimeDb) {
  return (await greptimeDb.unsafe(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_name = 'opentelemetry_traces'
       AND column_name LIKE $1`,
    [`${METADATA_PREFIX}%`],
  )) as Array<{ column_name: unknown }>;
}

export async function listSpans(
  greptimeDb: GreptimeDb,
  organizationId: string,
  agentSlug: string,
  branchSlug: string,
  from: Date,
  to: Date,
  page: number,
  pageSize: number,
  metadataFilters: Record<string, string>,
) {
  const offset = (page - 1) * pageSize;
  const limit = pageSize + 1;

  const params: unknown[] = [agentSlug, branchSlug, organizationId, from, to];
  function addParam(value: unknown) {
    params.push(value);
    return `$${params.length}`;
  }

  // Build dynamic metadata filter clauses
  let metaFilterSql = "";
  for (const [key, value] of Object.entries(metadataFilters)) {
    const columnName = escapeSqlIdentifier(`${METADATA_PREFIX}${key}`);
    metaFilterSql += ` AND "${columnName}" = ${addParam(value)}`;
  }

  const limitParam = addParam(limit);
  const offsetParam = addParam(offset);

  const queryText = `
    SELECT
      "timestamp" AS timestamp,
      "span_id" AS span_id,
      "span_status_code" AS span_status_code,
      "duration_nano" AS duration_nano,
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
    LIMIT ${limitParam} OFFSET ${offsetParam}
  `;

  const rows = (await greptimeDb.unsafe(queryText, params)) as any[];
  const hasNextPage = rows.length > pageSize;
  const pageRows = hasNextPage ? rows.slice(0, pageSize) : rows;

  const data = pageRows.map((row) => ({
    timestamp: String(row.timestamp),
    spanId: String(row.span_id ?? ""),
    operationName: String(row.operation_name ?? ""),
    model: String(row.response_model ?? ""),
    provider: String(row.provider_name ?? ""),
    status: formatStatus(row.span_status_code),
    durationMs: Number(row.duration_nano ?? 0) / 1e6,
    summary: extractSummary(row.output_message),
  }));

  return { data, hasNextPage };
}

export async function getSpan(
  greptimeDb: GreptimeDb,
  organizationId: string,
  agentSlug: string,
  branchSlug: string,
  spanId: string,
) {
  const metadataColumns = await getMetadataColumnNames(greptimeDb);

  const metadataSelectSql = metadataColumns
    .map(({ column_name }) => `"${escapeSqlIdentifier(String(column_name))}"`)
    .join(",\n      ");

  const queryText = `
    SELECT
      "timestamp" AS timestamp,
      "span_id" AS span_id,
      "span_status_code" AS span_status_code,
      "duration_nano" AS duration_nano,
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
      ${metadataSelectSql ? `,\n      ${metadataSelectSql}` : ""}
    FROM opentelemetry_traces
    WHERE "span_id" = $1
      AND "span_attributes.hebo.organization.id" = $2
      AND "span_attributes.hebo.agent.slug" = $3
      AND "span_attributes.hebo.branch.slug" = $4
      AND "span_attributes.gen_ai.operation.name" IS NOT NULL
    LIMIT 1
  `;

  const rows = await greptimeDb.unsafe(queryText, [spanId, organizationId, agentSlug, branchSlug]);
  const row = (rows as any[])[0];
  if (!row) return null;

  const spanAttributes: Record<string, string | number | boolean | null> = {};
  const metadata: Record<string, string> = {};

  for (const [key, value] of Object.entries(row)) {
    if (value === null || value === undefined) continue;
    if (key.startsWith("span_attributes.")) {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        spanAttributes[key.replace("span_attributes.", "")] = value;
      }
      if (key.startsWith(METADATA_PREFIX)) {
        metadata[key.replace(METADATA_PREFIX, "")] = String(value);
      }
    }
  }

  return {
    timestamp: String(row.timestamp),
    spanId: String(row.span_id ?? ""),
    operationName: String(row.operation_name ?? ""),
    model: String(row.request_model ?? ""),
    responseModel: String(row.response_model ?? ""),
    provider: String(row.provider_name ?? ""),
    status: formatStatus(row.span_status_code),
    durationMs: Number(row.duration_nano ?? 0) / 1e6,
    inputTokens: parseNullableNumber(row.input_tokens),
    outputTokens: parseNullableNumber(row.output_tokens),
    totalTokens: parseNullableNumber(row.total_tokens),
    reasoningTokens: parseNullableNumber(row.reasoning_tokens),
    inputMessages: (parseJsonArray(row.input_messages) ?? []) as SpanMessages,
    outputMessages: (parseJsonArray(row.output_messages) ?? []) as SpanMessages,
    finishReasons: (parseJsonArray(row.finish_reasons) ?? null) as SpanFinishReasons,
    responseId: String(row.response_id ?? ""),
    metadata,
    spanAttributes,
  };
}

export async function getMetadataTags(
  greptimeDb: GreptimeDb,
  organizationId: string,
  agentSlug: string,
  branchSlug: string,
  from: Date,
  to: Date,
) {
  const metadataColumns = await getMetadataColumnNames(greptimeDb);

  const columns = metadataColumns.map(({ column_name }) => {
    const colName = String(column_name);
    return {
      colName,
      keyName: colName.slice(METADATA_PREFIX.length),
    };
  });

  if (columns.length === 0) return { tags: {} };

  const rows = (await greptimeDb.unsafe(
    `SELECT ${columns.map(({ colName }) => `"${escapeSqlIdentifier(colName)}"`).join(", ")}
    FROM opentelemetry_traces
    WHERE "span_attributes.gen_ai.operation.name" IS NOT NULL
      AND "span_attributes.hebo.agent.slug" = $1
      AND "span_attributes.hebo.branch.slug" = $2
      AND "span_attributes.hebo.organization.id" = $3
      AND "timestamp" >= $4
      AND "timestamp" <= $5
    ORDER BY "timestamp" DESC
    LIMIT $6`,
    [agentSlug, branchSlug, organizationId, from, to, MAX_ROWS],
  )) as Array<Record<string, unknown>>;

  const tagSets = Object.fromEntries(
    columns.map(({ keyName }) => [keyName, new Set<string>()]),
  ) as Record<string, Set<string>>;

  for (const row of rows) {
    for (const { colName, keyName } of columns) {
      const value = row[colName];
      if (value !== null && value !== undefined) {
        tagSets[keyName].add(String(value));
      }
    }
  }

  return {
    tags: Object.fromEntries(
      columns.map(({ keyName }) => [
        keyName,
        [...tagSets[keyName]].sort().slice(0, MAX_VALUES_PER_KEY),
      ]),
    ),
  };
}
