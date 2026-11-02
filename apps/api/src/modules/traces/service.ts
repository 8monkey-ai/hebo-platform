import { GREPTIME_TRACE_TABLE_NAME } from "@hebo/shared-api/lib/greptime-otlp";

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

type SpanAttributes = Record<string, unknown>;

/** Reads a top-level string key of the `span_attributes` JSON2 column (keys contain dots). */
const spanAttribute = (key: string) => `span_attributes."${escapeSqlIdentifier(key)}"::STRING`;

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

function extractScalarAttributes(attributes: SpanAttributes) {
  const scalars: Record<string, string | number | boolean> = {};
  for (const key in attributes) {
    const value = attributes[key];
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      scalars[key] = value;
    }
  }
  return scalars;
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
  const params: unknown[] = [agentSlug, branchSlug, organizationId, from, to];
  function addParam(value: unknown) {
    params.push(value);
    return `$${params.length}`;
  }

  let metaFilterSql = "";
  for (const [key, value] of Object.entries(metadataFilters)) {
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
      "span_status_code" AS span_status_code,
      "span_status_message" AS span_status_message,
      "duration_nano" AS duration_nano,
      "span_attributes" AS span_attributes
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

  const metadataKeys = new Set<string>();
  const data = [];
  for (const row of pageRows) {
    const attributes = (row.span_attributes ?? {}) as SpanAttributes;
    const metadata = extractMetadata(attributes);
    for (const key in metadata) metadataKeys.add(key);
    data.push({
      timestamp: row.timestamp as Date,
      traceId: parseString(row.trace_id),
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
    metadataKeys: [...metadataKeys],
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
      spanAttributes: extractScalarAttributes(attributes),
    });
  }
  return result;
}
