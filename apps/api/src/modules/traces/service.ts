import { LRUCache } from "lru-cache";

import type { GreptimeDb } from "~api/middlewares/greptime";

import type { GenAIFinishReasons, GenAIInputMessages, GenAIOutputMessages } from "./types";
import {
  escapeSqlIdentifier,
  extractLastUserSummary,
  formatStatus,
  parseJsonArray,
  parseNullableNumber,
  parseString,
} from "./utils";

const METADATA_PREFIX = "span_attributes.gen_ai.request.metadata.";

const OPTIONAL_SPAN_COLUMNS = [
  {
    column: "span_attributes.gen_ai.usage.cache_read.input_tokens",
    alias: "cache_read_input_tokens",
  },
  { column: "span_attributes.gen_ai.usage.reasoning.output_tokens", alias: "reasoning_tokens" },
  { column: "span_attributes.gen_ai.request.reasoning.effort", alias: "reasoning_effort" },
  { column: "span_attributes.gen_ai.request.reasoning.enabled", alias: "reasoning_enabled" },
  { column: "span_attributes.gen_ai.request.reasoning.max_tokens", alias: "reasoning_max_tokens" },
] as const;

const traceColumnsCache = new LRUCache<
  string,
  { metadataColumns: string[]; optionalColumns: Set<string> }
>({
  max: 1,
  ttl: 2_000,
});

async function getTraceColumnNames(greptimeDb: GreptimeDb) {
  const cached = traceColumnsCache.get("trace_columns");
  if (cached) return cached;
  const rows = await greptimeDb.unsafe<Array<{ column_name: string }>>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_name = 'opentelemetry_traces'
       AND (column_name LIKE $1
         OR column_name IN (${OPTIONAL_SPAN_COLUMNS.map((_, i) => `$${i + 2}`).join(", ")}))`,
    [`${METADATA_PREFIX}%`, ...OPTIONAL_SPAN_COLUMNS.map(({ column }) => column)],
  );

  const metadataColumns: string[] = [];
  const optionalColumns = new Set<string>();
  for (const { column_name } of rows) {
    const name = column_name;
    if (name.startsWith(METADATA_PREFIX)) metadataColumns.push(name);
    else optionalColumns.add(name);
  }
  const result = { metadataColumns, optionalColumns };
  traceColumnsCache.set("trace_columns", result);
  return result;
}

export async function listTraces(
  greptimeDb: GreptimeDb,
  organizationId: string,
  agentSlug: string,
  branchSlug: string,
  from: Date,
  to: Date,
  page: number,
  pageSize: number,
  metadataFilters: Record<string, string>,
  statusFilter?: "ok" | "error",
  operationFilter?: "chat" | "embeddings",
) {
  const { metadataColumns } = await getTraceColumnNames(greptimeDb);
  const metadataKeys = metadataColumns.map((col) => col.slice(METADATA_PREFIX.length));

  const params: unknown[] = [agentSlug, branchSlug, organizationId, from, to];
  function addParam(value: unknown) {
    params.push(value);
    return `$${params.length}`;
  }

  let metaFilterSql = "";
  for (const [key, value] of Object.entries(metadataFilters)) {
    if (!metadataKeys.includes(key)) continue;
    metaFilterSql += ` AND "${escapeSqlIdentifier(`${METADATA_PREFIX}${key}`)}" = ${addParam(value)}`;
  }

  const HTTP_STATUS_COL = '"span_attributes.http.response.status_code"';
  let statusFilterSql = "";
  if (statusFilter === "ok") {
    statusFilterSql = ` AND (${HTTP_STATUS_COL} IS NOT NULL AND ${HTTP_STATUS_COL} < 400)`;
  } else if (statusFilter === "error") {
    statusFilterSql = ` AND (${HTTP_STATUS_COL} IS NULL OR ${HTTP_STATUS_COL} >= 400)`;
  }

  let operationFilterSql = "";
  if (operationFilter) {
    operationFilterSql = ` AND "span_attributes.gen_ai.operation.name" = ${addParam(operationFilter)}`;
  }

  const metadataSelectSql = metadataColumns
    .map((col) => `"${escapeSqlIdentifier(col)}"`)
    .join(",\n      ");

  const queryText = `
    SELECT
      "timestamp" AS timestamp,
      "trace_id" AS trace_id,
      "span_attributes.http.response.status_code" AS http_status_code,
      "span_status_message" AS span_status_message,
      "duration_nano" AS duration_nano,
      "span_attributes.gen_ai.operation.name" AS operation_name,
      "span_attributes.gen_ai.response.model" AS response_model,
      "span_attributes.gen_ai.provider.name" AS provider_name,
      "span_attributes.gen_ai.input.messages" AS input_messages
      ${metadataSelectSql ? `,\n      ${metadataSelectSql}` : ""}
    FROM opentelemetry_traces
    WHERE "span_attributes.gen_ai.operation.name" IS NOT NULL
      AND "span_attributes.hebo.agent.slug" = $1
      AND "span_attributes.hebo.branch.slug" = $2
      AND "span_attributes.hebo.organization.id" = $3
      AND "timestamp" >= $4
      AND "timestamp" <= $5
      ${metaFilterSql}
      ${statusFilterSql}
      ${operationFilterSql}
    ORDER BY "timestamp" DESC
    LIMIT ${addParam(pageSize + 1)} OFFSET ${addParam((page - 1) * pageSize)}
  `;

  const rows = await greptimeDb.unsafe<Record<string, unknown>[]>(queryText, params);
  const hasNextPage = rows.length > pageSize;
  const pageRows = hasNextPage ? rows.slice(0, pageSize) : rows;

  const data = [];
  for (const row of pageRows) {
    const metadata: Record<string, string> = {};
    for (const col of metadataColumns) {
      if (row[col] !== null && row[col] !== undefined) {
        metadata[col.slice(METADATA_PREFIX.length)] = parseString(row[col]);
      }
    }
    data.push({
      timestamp: row.timestamp as Date,
      traceId: parseString(row.trace_id),
      operationName: parseString(row.operation_name),
      model: parseString(row.response_model),
      provider: parseString(row.provider_name),
      status: formatStatus(row.http_status_code),
      statusMessage: parseString(row.span_status_message),
      durationMs: Number(row.duration_nano) / 1e6,
      summary: extractLastUserSummary(row.input_messages),
      metadata,
    });
  }

  return {
    data,
    hasNextPage,
    metadataKeys,
  };
}

export async function getSpans(
  greptimeDb: GreptimeDb,
  organizationId: string,
  agentSlug: string,
  branchSlug: string,
  traceId: string,
) {
  const { metadataColumns, optionalColumns } = await getTraceColumnNames(greptimeDb);

  const metadataSelectSql = metadataColumns
    .map((col) => `"${escapeSqlIdentifier(col)}"`)
    .join(",\n      ");

  const optionalColumnsSql = OPTIONAL_SPAN_COLUMNS.map(({ column, alias }) =>
    optionalColumns.has(column)
      ? `"${escapeSqlIdentifier(column)}" AS "${escapeSqlIdentifier(alias)}"`
      : `NULL AS "${escapeSqlIdentifier(alias)}"`,
  ).join(",\n      ");

  const queryText = `
    SELECT
      "timestamp" AS timestamp,
      "span_id" AS span_id,
      "span_attributes.http.response.status_code" AS http_status_code,
      "span_status_message" AS span_status_message,
      "duration_nano" AS duration_nano,
      "span_attributes.gen_ai.operation.name" AS operation_name,
      "span_attributes.gen_ai.request.model" AS request_model,
      "span_attributes.gen_ai.response.model" AS response_model,
      "span_attributes.gen_ai.provider.name" AS provider_name,
      "span_attributes.gen_ai.input.messages" AS input_messages,
      "span_attributes.gen_ai.output.messages" AS output_messages,
      "span_attributes.gen_ai.response.finish_reasons" AS finish_reasons,
      "span_attributes.gen_ai.response.id" AS response_id,
      "span_attributes.gen_ai.usage.input_tokens" AS input_tokens,
      "span_attributes.gen_ai.usage.output_tokens" AS output_tokens,
      "span_attributes.gen_ai.usage.total_tokens" AS total_tokens,
      ${optionalColumnsSql},
      "span_attributes.hebo.agent.slug",
      "span_attributes.hebo.branch.slug",
      "span_attributes.hebo.organization.id"
      ${metadataSelectSql ? `,\n      ${metadataSelectSql}` : ""}
    FROM opentelemetry_traces
    WHERE "trace_id" = $1
      AND "span_attributes.hebo.organization.id" = $2
      AND "span_attributes.hebo.agent.slug" = $3
      AND "span_attributes.hebo.branch.slug" = $4
      AND "span_attributes.gen_ai.operation.name" IS NOT NULL
    ORDER BY "timestamp" ASC
  `;

  const rows = await greptimeDb.unsafe<Record<string, unknown>[]>(queryText, [
    traceId,
    organizationId,
    agentSlug,
    branchSlug,
  ]);

  const result = [];
  for (const row of rows) {
    const spanAttributes: Record<string, string | number | boolean | null> = {};
    const metadata: Record<string, string> = {};

    for (const [key, value] of Object.entries(row)) {
      if (value === null || value === undefined) continue;
      if (key.startsWith("span_attributes.")) {
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          spanAttributes[key.replace("span_attributes.", "")] = value;
        }
        if (key.startsWith(METADATA_PREFIX) && typeof value === "string") {
          metadata[key.replace(METADATA_PREFIX, "")] = value;
        }
      }
    }

    result.push({
      timestamp: row.timestamp as Date,
      spanId: parseString(row.span_id),
      operationName: parseString(row.operation_name),
      model: parseString(row.request_model),
      responseModel: parseString(row.response_model),
      provider: parseString(row.provider_name),
      status: formatStatus(row.http_status_code),
      statusMessage: parseString(row.span_status_message),
      durationMs: Number(row.duration_nano ?? 0) / 1e6,
      inputTokens: parseNullableNumber(row.input_tokens),
      outputTokens: parseNullableNumber(row.output_tokens),
      totalTokens: parseNullableNumber(row.total_tokens),
      cacheReadInputTokens: parseNullableNumber(row.cache_read_input_tokens),
      reasoningTokens: parseNullableNumber(row.reasoning_tokens),
      reasoningEffort: parseString(row.reasoning_effort),
      reasoningEnabled: row.reasoning_enabled == null ? null : Boolean(row.reasoning_enabled),
      reasoningMaxTokens: parseNullableNumber(row.reasoning_max_tokens),
      inputMessages: parseJsonArray(row.input_messages) as GenAIInputMessages,
      outputMessages: parseJsonArray(row.output_messages) as GenAIOutputMessages,
      finishReasons: parseJsonArray(row.finish_reasons) as GenAIFinishReasons,
      responseId: parseString(row.response_id),
      metadata,
      spanAttributes,
    });
  }
  return result;
}
