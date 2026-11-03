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
const METADATA_KEYS_SAMPLE_SIZE = 500;

type SpanAttributes = Record<string, unknown>;

/** Reads a top-level string key of the `span_attributes` JSON2 column (keys contain dots). */
const spanAttribute = (key: string) => `span_attributes."${escapeSqlIdentifier(key)}"::STRING`;

/** Spans of one agent branch in a time window. Params: agentSlug, branchSlug, orgId, from, to. */
const BRANCH_SPANS_WHERE_SQL = `${spanAttribute("gen_ai.operation.name")} IS NOT NULL
  AND ${spanAttribute("hebo.agent.slug")} = $1
  AND ${spanAttribute("hebo.branch.slug")} = $2
  AND ${spanAttribute("hebo.organization.id")} = $3
  AND "timestamp" >= $4
  AND "timestamp" <= $5`;

function extractMetadata(attributes: SpanAttributes) {
  const metadata: Record<string, string> = {};
  for (const key in attributes) {
    const value = attributes[key];
    if (key.startsWith(METADATA_PREFIX) && typeof value === "string") {
      metadata[key.slice(METADATA_PREFIX.length)] = value;
    }
  }
  return metadata;
}

/** Besides metadata, the only attributes V1 returned under their own names; keep that shape. */
const SPAN_ATTRIBUTE_KEYS = new Set([
  "hebo.agent.slug",
  "hebo.branch.slug",
  "hebo.organization.id",
]);

function extractSpanAttributes(attributes: SpanAttributes) {
  const spanAttributes: Record<string, string | number | boolean> = {};
  for (const key in attributes) {
    const value = attributes[key];
    if (!SPAN_ATTRIBUTE_KEYS.has(key) && !key.startsWith(METADATA_PREFIX)) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      spanAttributes[key] = value;
    }
  }
  return spanAttributes;
}

/**
 * Metadata filters whose key some span in the table has (any org, any time). On V1 a filter
 * on a key without a column was ignored; JSON2 has no key catalog, so check the data.
 */
async function filterKnownMetadataKeys(
  greptimeDb: GreptimeDb,
  metadataFilters: Record<string, string>,
) {
  const known = await Promise.all(
    Object.entries(metadataFilters).map(async (entry) => {
      const rows = await greptimeDb.unsafe<unknown[]>(
        `SELECT 1 FROM ${GREPTIME_TRACE_TABLE_NAME}
         WHERE ${spanAttribute(`${METADATA_PREFIX}${entry[0]}`)} IS NOT NULL
         LIMIT 1`,
      );
      return rows.length > 0 ? [entry] : [];
    }),
  );
  return Object.fromEntries(known.flat());
}

/**
 * Distinct metadata keys of the latest spans in the time window (JSON2 has no key catalog).
 * Reading the whole JSON2 object scans it for every row in the window before filtering, so
 * first pick the latest spans via cheap path filters, then narrow the read by `trace_id`
 * (bloom index) and timestamp.
 */
async function listMetadataKeys(
  greptimeDb: GreptimeDb,
  organizationId: string,
  agentSlug: string,
  branchSlug: string,
  from: Date,
  to: Date,
) {
  const latest = await greptimeDb.unsafe<Array<{ trace_id: string; timestamp: Date }>>(
    `SELECT "trace_id" AS trace_id, "timestamp" AS timestamp
     FROM ${GREPTIME_TRACE_TABLE_NAME}
     WHERE ${BRANCH_SPANS_WHERE_SQL}
     ORDER BY "timestamp" DESC
     LIMIT ${METADATA_KEYS_SAMPLE_SIZE}`,
    [agentSlug, branchSlug, organizationId, from, to],
  );
  if (latest.length === 0) return [];

  const traceIds = [...new Set(latest.map((row) => row.trace_id))];
  const rows = await greptimeDb.unsafe<Array<{ key: string }>>(
    `SELECT key FROM (
       SELECT unnest(json_object_keys(parse_json(json_get(span_attributes, '$')))) AS key
       FROM ${GREPTIME_TRACE_TABLE_NAME}
       WHERE ${BRANCH_SPANS_WHERE_SQL}
         AND "trace_id" IN (${traceIds.map((_, i) => `$${i + 6}`).join(", ")})
     )
     WHERE starts_with(key, '${METADATA_PREFIX}')
     GROUP BY key
     ORDER BY key`,
    [agentSlug, branchSlug, organizationId, latest.at(-1)!.timestamp, to, ...traceIds],
  );
  return rows.map(({ key }) => key.slice(METADATA_PREFIX.length));
}

type PageRow = Record<string, unknown> & { timestamp: Date; trace_id: string; span_id: string };

const spanKey = (row: { trace_id: string; span_id: string }) => `${row.trace_id}:${row.span_id}`;

/**
 * Whole `span_attributes` objects of the given page spans (ordered by timestamp DESC), keyed
 * by `spanKey`. Reading the JSON2 object scans it for every row in the time range before
 * filtering, so narrow the read by `trace_id` (bloom index) and the page's timestamp range.
 */
async function readSpanAttributes(
  greptimeDb: GreptimeDb,
  organizationId: string,
  agentSlug: string,
  branchSlug: string,
  spans: PageRow[],
) {
  const attributesBySpan = new Map<string, SpanAttributes>();
  if (spans.length === 0) return attributesBySpan;

  const from = spans.at(-1)!.timestamp;
  const to = spans[0].timestamp;
  const traceIds = [...new Set(spans.map((span) => span.trace_id))];
  const rows = await greptimeDb.unsafe<
    Array<{ trace_id: string; span_id: string; span_attributes: SpanAttributes | null }>
  >(
    `SELECT
       "trace_id" AS trace_id,
       "span_id" AS span_id,
       "span_attributes" AS span_attributes
     FROM ${GREPTIME_TRACE_TABLE_NAME}
     WHERE ${BRANCH_SPANS_WHERE_SQL}
       AND "trace_id" IN (${traceIds.map((_, i) => `$${i + 6}`).join(", ")})`,
    // Timestamps come back with millisecond precision, so widen the upper bound by 1 ms.
    [agentSlug, branchSlug, organizationId, from, new Date(to.getTime() + 1), ...traceIds],
  );
  for (const row of rows) attributesBySpan.set(spanKey(row), row.span_attributes ?? {});
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
  let statusFilterSql = "";
  if (statusFilter === "ok") {
    statusFilterSql = ` AND "span_status_code" IN ('STATUS_CODE_OK', 'STATUS_CODE_UNSET')`;
  } else if (statusFilter === "error") {
    statusFilterSql = ` AND "span_status_code" = 'STATUS_CODE_ERROR'`;
  }

  // Page selection uses path filters only; the whole `span_attributes` objects are read
  // afterwards for just the page rows (see `readSpanAttributes`).
  const selectPage = (filters: Record<string, string>) => {
    const params: unknown[] = [agentSlug, branchSlug, organizationId, from, to];
    function addParam(value: unknown) {
      params.push(value);
      return `$${params.length}`;
    }

    let metaFilterSql = "";
    for (const [key, value] of Object.entries(filters)) {
      metaFilterSql += ` AND ${spanAttribute(`${METADATA_PREFIX}${key}`)} = ${addParam(value)}`;
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
      WHERE ${BRANCH_SPANS_WHERE_SQL}
        ${metaFilterSql}
        ${statusFilterSql}
        ${operationFilterSql}
      ORDER BY "timestamp" DESC
      LIMIT ${addParam(pageSize + 1)} OFFSET ${addParam((page - 1) * pageSize)}
    `;
    return greptimeDb.unsafe<PageRow[]>(queryText, params);
  };

  const listPage = async () => {
    let rows = await selectPage(metadataFilters);
    // Filters on keys no span has are ignored (as on V1). Any returned row proves its filter
    // keys exist, so only check the keys when the page is empty.
    if (rows.length === 0 && Object.keys(metadataFilters).length > 0) {
      const knownFilters = await filterKnownMetadataKeys(greptimeDb, metadataFilters);
      if (Object.keys(knownFilters).length < Object.keys(metadataFilters).length) {
        rows = await selectPage(knownFilters);
      }
    }
    const hasNextPage = rows.length > pageSize;
    const pageRows = hasNextPage ? rows.slice(0, pageSize) : rows;
    const attributesBySpan = await readSpanAttributes(
      greptimeDb,
      organizationId,
      agentSlug,
      branchSlug,
      pageRows,
    );
    return { pageRows, hasNextPage, attributesBySpan };
  };

  const [{ pageRows, hasNextPage, attributesBySpan }, metadataKeys] = await Promise.all([
    listPage(),
    listMetadataKeys(greptimeDb, organizationId, agentSlug, branchSlug, from, to),
  ]);

  const data = [];
  for (const row of pageRows) {
    const attributes = attributesBySpan.get(spanKey(row)) ?? {};
    const metadata = extractMetadata(attributes);
    data.push({
      timestamp: row.timestamp,
      traceId: row.trace_id,
      operationName: parseString(attributes["gen_ai.operation.name"]),
      model: parseString(attributes["gen_ai.response.model"]),
      provider: parseString(attributes["gen_ai.provider.name"]),
      status: formatStatus(row.span_status_code),
      statusMessage: parseString(row.span_status_message),
      durationMs: Number(row.duration_nano) / 1e6,
      summary: extractLastUserSummary(attributes["gen_ai.input.messages"]),
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
    const attributes = (row.span_attributes ?? {}) as SpanAttributes;
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
      metadata: extractMetadata(attributes),
      spanAttributes: extractSpanAttributes(attributes),
    });
  }
  return result;
}
