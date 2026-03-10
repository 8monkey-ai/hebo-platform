import { SQL } from "bun";

import { getSecret } from "@hebo/shared-api/utils/secrets";

const greptimeEndpoint = (await getSecret("GreptimeEndpoint")) ?? "localhost";
const greptimePgPort = 4003;

const db = new SQL({
  hostname: new URL(
    greptimeEndpoint.startsWith("http") ? greptimeEndpoint : `http://${greptimeEndpoint}`,
  ).hostname,
  port: greptimePgPort,
  database: "public",
  username: "",
  password: "",
});

export type TraceRow = {
  timestamp: string;
  duration_nano: number;
  trace_id: string;
  span_id: string;
  span_name: string;
  span_status_code: string;
  operation_name: string | null;
  request_model: string | null;
  response_model: string | null;
  provider_name: string | null;
  input_messages: unknown;
  output_messages: unknown;
  response_id: string | null;
  finish_reasons: unknown;
  total_tokens: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  reasoning_output_tokens: number | null;
};

export type TraceListResult = {
  data: TraceRow[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listTraces(opts: {
  agentSlug: string;
  branchSlug: string;
  from: Date;
  to: Date;
  page: number;
  pageSize: number;
  metadata?: Record<string, string>;
}): Promise<TraceListResult> {
  const { agentSlug, branchSlug, from, to, page, pageSize, metadata } = opts;
  const offset = (page - 1) * pageSize;

  // Build metadata filter clauses
  let metadataWhere = "";
  if (metadata) {
    for (const [key, value] of Object.entries(metadata)) {
      // GreptimeDB uses flattened column names with dots, quoted with double quotes
      metadataWhere += ` AND "span_attributes.gen_ai.request.metadata.${key}" = '${value.replace(/'/g, "''")}'`;
    }
  }

  // GreptimeDB uses flattened column names - each span attribute is a separate column
  const query = `
    SELECT
      "timestamp",
      "duration_nano",
      "trace_id",
      "span_id",
      "span_name",
      "span_status_code",
      "span_attributes.gen_ai.operation.name" AS "operation_name",
      "span_attributes.gen_ai.request.model" AS "request_model",
      "span_attributes.gen_ai.response.model" AS "response_model",
      "span_attributes.gen_ai.provider.name" AS "provider_name",
      "span_attributes.gen_ai.input.messages" AS "input_messages",
      "span_attributes.gen_ai.output.messages" AS "output_messages",
      "span_attributes.gen_ai.response.id" AS "response_id",
      "span_attributes.gen_ai.response.finish_reasons" AS "finish_reasons",
      "span_attributes.gen_ai.usage.total_tokens" AS "total_tokens",
      "span_attributes.gen_ai.usage.input_tokens" AS "input_tokens",
      "span_attributes.gen_ai.usage.output_tokens" AS "output_tokens",
      "span_attributes.gen_ai.usage.reasoning.output_tokens" AS "reasoning_output_tokens"
    FROM opentelemetry_traces
    WHERE "span_attributes.gen_ai.operation.name" IS NOT NULL
      AND "span_attributes.hebo.agent.slug" = '${agentSlug.replace(/'/g, "''")}'
      AND "span_attributes.hebo.branch.slug" = '${branchSlug.replace(/'/g, "''")}'
      AND "timestamp" >= '${from.toISOString()}'
      AND "timestamp" <= '${to.toISOString()}'
      ${metadataWhere}
    ORDER BY "timestamp" DESC
    LIMIT ${pageSize} OFFSET ${offset}
  `;

  const countQuery = `
    SELECT COUNT(*) AS "total"
    FROM opentelemetry_traces
    WHERE "span_attributes.gen_ai.operation.name" IS NOT NULL
      AND "span_attributes.hebo.agent.slug" = '${agentSlug.replace(/'/g, "''")}'
      AND "span_attributes.hebo.branch.slug" = '${branchSlug.replace(/'/g, "''")}'
      AND "timestamp" >= '${from.toISOString()}'
      AND "timestamp" <= '${to.toISOString()}'
      ${metadataWhere}
  `;

  const [rows, countRows] = await Promise.all([
    db.unsafe(query) as Promise<TraceRow[]>,
    db.unsafe(countQuery) as Promise<Array<{ total: number }>>,
  ]);

  return {
    data: rows,
    total: Number(countRows[0]?.total ?? 0),
    page,
    pageSize,
  };
}

export async function getTrace(opts: {
  agentSlug: string;
  branchSlug: string;
  traceId: string;
}): Promise<TraceRow | null> {
  const { agentSlug, branchSlug, traceId } = opts;

  const query = `
    SELECT
      "timestamp",
      "duration_nano",
      "trace_id",
      "span_id",
      "span_name",
      "span_status_code",
      "span_attributes.gen_ai.operation.name" AS "operation_name",
      "span_attributes.gen_ai.request.model" AS "request_model",
      "span_attributes.gen_ai.response.model" AS "response_model",
      "span_attributes.gen_ai.provider.name" AS "provider_name",
      "span_attributes.gen_ai.input.messages" AS "input_messages",
      "span_attributes.gen_ai.output.messages" AS "output_messages",
      "span_attributes.gen_ai.response.id" AS "response_id",
      "span_attributes.gen_ai.response.finish_reasons" AS "finish_reasons",
      "span_attributes.gen_ai.usage.total_tokens" AS "total_tokens",
      "span_attributes.gen_ai.usage.input_tokens" AS "input_tokens",
      "span_attributes.gen_ai.usage.output_tokens" AS "output_tokens",
      "span_attributes.gen_ai.usage.reasoning.output_tokens" AS "reasoning_output_tokens"
    FROM opentelemetry_traces
    WHERE "span_attributes.gen_ai.operation.name" IS NOT NULL
      AND "span_attributes.hebo.agent.slug" = '${agentSlug.replace(/'/g, "''")}'
      AND "span_attributes.hebo.branch.slug" = '${branchSlug.replace(/'/g, "''")}'
      AND "trace_id" = '${traceId.replace(/'/g, "''")}'
    LIMIT 1
  `;

  const rows = (await db.unsafe(query)) as TraceRow[];
  return rows[0] ?? null;
}

export async function getMetadataKeys(_opts: {
  agentSlug: string;
  branchSlug: string;
  from: Date;
  to: Date;
}): Promise<string[]> {

  // GreptimeDB uses information_schema.columns to discover flattened column names
  const query = `
    SELECT "Column" AS "column_name"
    FROM information_schema.columns
    WHERE "table_name" = 'opentelemetry_traces'
      AND "Column" LIKE 'span_attributes.gen_ai.request.metadata.%'
  `;

  const rows = (await db.unsafe(query)) as Array<{ column_name: string }>;

  // Strip the prefix to return just the metadata key names
  return rows.map((r) => r.column_name.replace("span_attributes.gen_ai.request.metadata.", ""));
}

export async function getMetadataValues(opts: {
  agentSlug: string;
  branchSlug: string;
  key: string;
  from: Date;
  to: Date;
}): Promise<string[]> {
  const { agentSlug, branchSlug, key, from, to } = opts;

  const columnName = `span_attributes.gen_ai.request.metadata.${key}`;

  const query = `
    SELECT DISTINCT "${columnName}" AS "value"
    FROM opentelemetry_traces
    WHERE "span_attributes.gen_ai.operation.name" IS NOT NULL
      AND "span_attributes.hebo.agent.slug" = '${agentSlug.replace(/'/g, "''")}'
      AND "span_attributes.hebo.branch.slug" = '${branchSlug.replace(/'/g, "''")}'
      AND "timestamp" >= '${from.toISOString()}'
      AND "timestamp" <= '${to.toISOString()}'
      AND "${columnName}" IS NOT NULL
    LIMIT 50
  `;

  const rows = (await db.unsafe(query)) as Array<{ value: string }>;
  return rows.map((r) => r.value);
}
