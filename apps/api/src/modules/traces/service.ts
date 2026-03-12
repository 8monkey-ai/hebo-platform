import { SQL } from "bun";

const greptimeDb = new SQL({
  url: process.env.GREPTIME_PG_URL ?? "postgres://localhost:4003/public",
});

const GEN_AI_COLUMNS = {
  operationName: "span_attributes.gen_ai.operation.name",
  requestModel: "span_attributes.gen_ai.request.model",
  responseModel: "span_attributes.gen_ai.response.model",
  provider: "span_attributes.gen_ai.provider.name",
  inputMessages: "span_attributes.gen_ai.input.messages",
  outputMessages: "span_attributes.gen_ai.output.messages",
  responseId: "span_attributes.gen_ai.response.id",
  finishReasons: "span_attributes.gen_ai.response.finish_reasons",
  inputTokens: "span_attributes.gen_ai.usage.input_tokens",
  outputTokens: "span_attributes.gen_ai.usage.output_tokens",
  totalTokens: "span_attributes.gen_ai.usage.total_tokens",
  reasoningTokens: "span_attributes.gen_ai.usage.reasoning.output_tokens",
} as const;

const METADATA_PREFIX = "span_attributes.gen_ai.request.metadata.";

function extractSummary(outputMessages: unknown): string {
  const last = Array.isArray(outputMessages) && outputMessages.at(-1);
  const content =
    typeof last === "string" ? last : typeof last?.content === "string" ? last.content : "";

  return content.slice(0, 150) + (content.length > 150 ? "..." : "");
}

export type ListTracesOpts = {
  agentSlug: string;
  branchSlug: string;
  from: Date;
  to: Date;
  page: number;
  pageSize: number;
  metadataFilters: Record<string, string>;
};

export async function listTraces(opts: ListTracesOpts) {
  const { agentSlug, branchSlug, from, to, page, pageSize, metadataFilters } = opts;
  const offset = (page - 1) * pageSize;

  // Build dynamic metadata filter clauses
  const metaKeys = Object.keys(metadataFilters);
  let metaFilterSql = "";
  const metaValues: string[] = [];
  for (const key of metaKeys) {
    metaFilterSql += ` AND "${METADATA_PREFIX}${key}" = $${metaValues.length + 5}`;
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
      "${GEN_AI_COLUMNS.operationName}" AS operation_name,
      "${GEN_AI_COLUMNS.requestModel}" AS request_model,
      "${GEN_AI_COLUMNS.provider}" AS provider_name,
      "${GEN_AI_COLUMNS.outputMessages}" AS output_messages
    FROM opentelemetry_traces
    WHERE "${GEN_AI_COLUMNS.operationName}" IS NOT NULL
      AND "span_attributes.hebo.agent.slug" = $1
      AND "span_attributes.hebo.branch.slug" = $2
      AND "timestamp" >= $3
      AND "timestamp" <= $4
      ${metaFilterSql}
    ORDER BY "timestamp" DESC
    LIMIT ${pageSize} OFFSET ${offset}
  `;

  const countText = `
    SELECT COUNT(*) AS cnt
    FROM opentelemetry_traces
    WHERE "${GEN_AI_COLUMNS.operationName}" IS NOT NULL
      AND "span_attributes.hebo.agent.slug" = $1
      AND "span_attributes.hebo.branch.slug" = $2
      AND "timestamp" >= $3
      AND "timestamp" <= $4
      ${metaFilterSql}
  `;

  const params = [agentSlug, branchSlug, from.toISOString(), to.toISOString(), ...metaValues];

  const [rows, countRows] = await Promise.all([
    greptimeDb.unsafe(queryText, params),
    greptimeDb.unsafe(countText, params),
  ]);

  const total = Number(countRows[0]?.cnt ?? 0);

  const data = (rows as any[]).map((row) => {
    const outputMessages = parseJson(row.output_messages);
    return {
      timestamp: String(row.timestamp),
      traceId: String(row.trace_id ?? ""),
      spanId: String(row.span_id ?? ""),
      operationName: String(row.operation_name ?? ""),
      model: String(row.request_model ?? ""),
      provider: String(row.provider_name ?? ""),
      status: formatStatus(row.span_status_code),
      durationMs: Number(row.duration_nano ?? 0) / 1e6,
      summary: extractSummary(outputMessages),
    };
  });

  return { data, total, page, pageSize };
}

export async function getTrace(agentSlug: string, branchSlug: string, traceId: string) {
  const queryText = `
    SELECT *
    FROM opentelemetry_traces
    WHERE trace_id = $1
      AND "span_attributes.hebo.agent.slug" = $2
      AND "span_attributes.hebo.branch.slug" = $3
      AND "${GEN_AI_COLUMNS.operationName}" IS NOT NULL
    LIMIT 1
  `;

  const rows = await greptimeDb.unsafe(queryText, [traceId, agentSlug, branchSlug]);
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
    operationName: String(row[GEN_AI_COLUMNS.operationName] ?? ""),
    model: String(row[GEN_AI_COLUMNS.requestModel] ?? ""),
    responseModel: String(row[GEN_AI_COLUMNS.responseModel] ?? ""),
    provider: String(row[GEN_AI_COLUMNS.provider] ?? ""),
    status: formatStatus(row.span_status_code),
    statusMessage: String(row.span_status_message ?? ""),
    durationMs: Number(row.duration_nano ?? 0) / 1e6,
    inputTokens: row[GEN_AI_COLUMNS.inputTokens] ?? null,
    outputTokens: row[GEN_AI_COLUMNS.outputTokens] ?? null,
    totalTokens: row[GEN_AI_COLUMNS.totalTokens] ?? null,
    reasoningTokens: row[GEN_AI_COLUMNS.reasoningTokens] ?? null,
    inputMessages: parseJsonArray(row[GEN_AI_COLUMNS.inputMessages]),
    outputMessages: parseJsonArray(row[GEN_AI_COLUMNS.outputMessages]),
    finishReasons: parseJsonArray(row[GEN_AI_COLUMNS.finishReasons]),
    responseId: String(row[GEN_AI_COLUMNS.responseId] ?? ""),
    metadata,
    spanAttributes,
    resourceAttributes,
  };
}

export async function getMetadataTags(agentSlug: string, branchSlug: string, from: Date, to: Date) {
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
         WHERE "${GEN_AI_COLUMNS.operationName}" IS NOT NULL
           AND "span_attributes.hebo.agent.slug" = $1
           AND "span_attributes.hebo.branch.slug" = $2
           AND "timestamp" >= $3
           AND "timestamp" <= $4
           AND "${colName}" IS NOT NULL
         LIMIT 50`,
        [agentSlug, branchSlug, from.toISOString(), to.toISOString()],
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

function parseJson(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

function parseJsonArray(value: unknown): any[] | null {
  const parsed = parseJson(value);
  return Array.isArray(parsed) ? parsed : null;
}
