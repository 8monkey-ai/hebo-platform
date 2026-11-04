import { GREPTIME_TRACE_TABLE_NAME } from "@hebo/shared-api/lib/otel";

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

const METADATA_PREFIX = "gen_ai.request.metadata.";

/** Reads a top-level key of the `span_attributes` JSON2 column (keys contain dots). */
const spanAttribute = (key: string) => `span_attributes."${escapeSqlIdentifier(key)}"::STRING`;

/** JSON2 has no key catalog, so list the metadata keys of the branch's spans in the window. */
async function getMetadataKeys(
  greptimeDb: GreptimeDb,
  organizationId: string,
  agentSlug: string,
  branchSlug: string,
  from: Date,
  to: Date,
) {
  const rows = await greptimeDb.unsafe<Array<{ key: string }>>(
    `SELECT DISTINCT key FROM (
       SELECT unnest(json_object_keys(parse_json(json_get(span_attributes, '$')))) AS key
       FROM ${GREPTIME_TRACE_TABLE_NAME}
       WHERE ${spanAttribute("gen_ai.operation.name")} IS NOT NULL
         AND ${spanAttribute("hebo.agent.slug")} = $1
         AND ${spanAttribute("hebo.branch.slug")} = $2
         AND ${spanAttribute("hebo.organization.id")} = $3
         AND "timestamp" >= $4
         AND "timestamp" <= $5
     )
     WHERE starts_with(key, '${METADATA_PREFIX}')
     ORDER BY key`,
    [agentSlug, branchSlug, organizationId, from, to],
  );
  return rows.map(({ key }) => key);
}

/** Whether any span in the table has the metadata key (V1 had a column for it). */
async function hasMetadataKey(greptimeDb: GreptimeDb, key: string) {
  const rows = await greptimeDb.unsafe<unknown[]>(
    `SELECT 1 FROM ${GREPTIME_TRACE_TABLE_NAME}
     WHERE ${spanAttribute(`${METADATA_PREFIX}${key}`)} IS NOT NULL
     LIMIT 1`,
  );
  return rows.length > 0;
}

const spanKey = (row: Record<string, unknown>) =>
  `${parseString(row.trace_id)}:${parseString(row.span_id)}`;

/**
 * Reads the attributes shown in the list for just the page's spans. Greptime decodes
 * non-scalar and overflow JSON2 paths (e.g. `gen_ai.input.messages`) for every row it
 * scans, so the page query only reads plain columns and this narrows by `trace_id`.
 */
async function getPageSpanAttributes(
  greptimeDb: GreptimeDb,
  organizationId: string,
  agentSlug: string,
  branchSlug: string,
  from: Date,
  to: Date,
  pageRows: Record<string, unknown>[],
  metadataColumns: string[],
) {
  const attributesBySpan = new Map<string, Record<string, unknown>>();
  if (pageRows.length === 0) return attributesBySpan;

  const traceIds = [...new Set(pageRows.map((row) => row.trace_id))];
  const metadataSelectSql = metadataColumns
    .map((col) => `,\n      ${spanAttribute(col)} AS "${escapeSqlIdentifier(col)}"`)
    .join("");

  const rows = await greptimeDb.unsafe<Record<string, unknown>[]>(
    `SELECT
      "trace_id" AS trace_id,
      "span_id" AS span_id,
      ${spanAttribute("gen_ai.operation.name")} AS operation_name,
      ${spanAttribute("gen_ai.response.model")} AS response_model,
      ${spanAttribute("gen_ai.provider.name")} AS provider_name,
      ${spanAttribute("gen_ai.input.messages")} AS input_messages${metadataSelectSql}
    FROM ${GREPTIME_TRACE_TABLE_NAME}
    WHERE "trace_id" IN (${traceIds.map((_, i) => `$${i + 6}`).join(", ")})
      AND ${spanAttribute("hebo.agent.slug")} = $1
      AND ${spanAttribute("hebo.branch.slug")} = $2
      AND ${spanAttribute("hebo.organization.id")} = $3
      AND "timestamp" >= $4
      AND "timestamp" <= $5`,
    [agentSlug, branchSlug, organizationId, from, to, ...traceIds],
  );
  for (const row of rows) attributesBySpan.set(spanKey(row), row);
  return attributesBySpan;
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
  operationFilter?: "chat" | "embeddings" | "transcriptions",
) {
  const metadataColumns = await getMetadataKeys(
    greptimeDb,
    organizationId,
    agentSlug,
    branchSlug,
    from,
    to,
  );
  const metadataKeys = metadataColumns.map((col) => col.slice(METADATA_PREFIX.length));

  const params: unknown[] = [agentSlug, branchSlug, organizationId, from, to];
  function addParam(value: unknown) {
    params.push(value);
    return `$${params.length}`;
  }

  const metadataFilterEntries = Object.entries(metadataFilters);
  const knownFilterKeys = await Promise.all(
    metadataFilterEntries.map(
      async ([key]) => metadataKeys.includes(key) || (await hasMetadataKey(greptimeDb, key)),
    ),
  );

  let metaFilterSql = "";
  for (const [i, [key, value]] of metadataFilterEntries.entries()) {
    if (!knownFilterKeys[i]) continue;
    metaFilterSql += ` AND ${spanAttribute(`${METADATA_PREFIX}${key}`)} = ${addParam(value)}`;
  }

  let statusFilterSql = "";
  if (statusFilter === "ok") {
    statusFilterSql = ` AND "span_status_code" IN ('STATUS_CODE_OK', 'STATUS_CODE_UNSET')`;
  } else if (statusFilter === "error") {
    statusFilterSql = ` AND "span_status_code" = 'STATUS_CODE_ERROR'`;
  }

  let operationFilterSql = "";
  if (operationFilter) {
    operationFilterSql = ` AND ${spanAttribute("gen_ai.operation.name")} = ${addParam(operationFilter)}`;
  }

  const queryText = `
    SELECT
      "timestamp" AS timestamp,
      "trace_id" AS trace_id,
      "span_id" AS span_id,
      "span_status_code" AS span_status_code,
      "span_status_message" AS span_status_message,
      "duration_nano" AS duration_nano
    FROM ${GREPTIME_TRACE_TABLE_NAME}
    WHERE ${spanAttribute("gen_ai.operation.name")} IS NOT NULL
      AND ${spanAttribute("hebo.agent.slug")} = $1
      AND ${spanAttribute("hebo.branch.slug")} = $2
      AND ${spanAttribute("hebo.organization.id")} = $3
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
  const attributesBySpan = await getPageSpanAttributes(
    greptimeDb,
    organizationId,
    agentSlug,
    branchSlug,
    from,
    to,
    pageRows,
    metadataColumns,
  );

  const data = [];
  for (const row of pageRows) {
    const attributes = attributesBySpan.get(spanKey(row)) ?? {};
    const metadata: Record<string, string> = {};
    for (const col of metadataColumns) {
      if (attributes[col] !== null && attributes[col] !== undefined) {
        metadata[col.slice(METADATA_PREFIX.length)] = parseString(attributes[col]);
      }
    }
    data.push({
      timestamp: row.timestamp as Date,
      traceId: parseString(row.trace_id),
      operationName: parseString(attributes.operation_name),
      model: parseString(attributes.response_model),
      provider: parseString(attributes.provider_name),
      status: formatStatus(row.span_status_code),
      statusMessage: parseString(row.span_status_message),
      durationMs: Number(row.duration_nano) / 1e6,
      // A JSON2 path read returns arrays as JSON text.
      summary: extractLastUserSummary(
        attributes.input_messages == null ? null : JSON.parse(attributes.input_messages as string),
      ),
      metadata,
    });
  }

  return {
    data,
    hasNextPage,
    metadataKeys,
  };
}

/** Besides metadata, the only attributes V1 returned in `spanAttributes`. */
const SPAN_ATTRIBUTE_KEYS = new Set([
  "hebo.agent.slug",
  "hebo.branch.slug",
  "hebo.organization.id",
]);

export async function getSpans(
  greptimeDb: GreptimeDb,
  organizationId: string,
  agentSlug: string,
  branchSlug: string,
  traceId: string,
) {
  const queryText = `
    SELECT
      "timestamp" AS timestamp,
      "span_id" AS span_id,
      "span_status_code" AS span_status_code,
      "span_status_message" AS span_status_message,
      "duration_nano" AS duration_nano,
      "span_attributes" AS span_attributes
    FROM ${GREPTIME_TRACE_TABLE_NAME}
    WHERE "trace_id" = $1
      AND ${spanAttribute("hebo.organization.id")} = $2
      AND ${spanAttribute("hebo.agent.slug")} = $3
      AND ${spanAttribute("hebo.branch.slug")} = $4
      AND ${spanAttribute("gen_ai.operation.name")} IS NOT NULL
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
    const attributes = (row.span_attributes ?? {}) as Record<string, unknown>;
    const spanAttributes: Record<string, string | number | boolean | null> = {};
    const metadata: Record<string, string> = {};

    for (const [key, value] of Object.entries(attributes)) {
      if (value === null || value === undefined) continue;
      const isMetadata = key.startsWith(METADATA_PREFIX);
      if (isMetadata || SPAN_ATTRIBUTE_KEYS.has(key)) {
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          spanAttributes[key] = value;
        }
        if (isMetadata && typeof value === "string") {
          metadata[key.slice(METADATA_PREFIX.length)] = value;
        }
      }
    }

    const reasoningEnabled = attributes["gen_ai.request.reasoning.enabled"];
    result.push({
      timestamp: row.timestamp as Date,
      spanId: parseString(row.span_id),
      operationName: parseString(attributes["gen_ai.operation.name"]),
      model: parseString(attributes["gen_ai.request.model"]),
      responseModel: parseString(attributes["gen_ai.response.model"]),
      provider: parseString(attributes["gen_ai.provider.name"]),
      status: formatStatus(row.span_status_code),
      statusMessage: parseString(row.span_status_message),
      durationMs: Number(row.duration_nano ?? 0) / 1e6,
      inputTokens: parseNullableNumber(attributes["gen_ai.usage.input_tokens"]),
      outputTokens: parseNullableNumber(attributes["gen_ai.usage.output_tokens"]),
      totalTokens: parseNullableNumber(attributes["gen_ai.usage.total_tokens"]),
      cacheReadInputTokens: parseNullableNumber(attributes["gen_ai.usage.cache_read.input_tokens"]),
      reasoningTokens: parseNullableNumber(attributes["gen_ai.usage.reasoning.output_tokens"]),
      reasoningEffort: parseString(attributes["gen_ai.request.reasoning.effort"]),
      reasoningEnabled: reasoningEnabled == null ? null : Boolean(reasoningEnabled),
      reasoningMaxTokens: parseNullableNumber(attributes["gen_ai.request.reasoning.max_tokens"]),
      inputMessages: parseJsonArray(attributes["gen_ai.input.messages"]) as GenAIInputMessages,
      outputMessages: parseJsonArray(attributes["gen_ai.output.messages"]) as GenAIOutputMessages,
      finishReasons: parseJsonArray(
        attributes["gen_ai.response.finish_reasons"],
      ) as GenAIFinishReasons,
      responseId: parseString(attributes["gen_ai.response.id"]),
      metadata,
      spanAttributes,
    });
  }
  return result;
}
