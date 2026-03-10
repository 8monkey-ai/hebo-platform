import { SQL } from "bun";

import { getSecret } from "@hebo/shared-api/utils/secrets";

import type { TraceDetail, TraceSummary } from "./types";

const greptimeEndpoint = (await getSecret("GreptimeEndpoint")) ?? "http://localhost:4000";
const greptimePgUrl = greptimeEndpoint.replace(/:\d+.*$/, ":4003/public").replace("http://", "postgres://");

const greptimeDb = new SQL({
  url: process.env.GREPTIME_PG_URL ?? greptimePgUrl,
});

function resolveTimeRange(opts: { from?: string; to?: string; timeRange?: string }) {
  const now = new Date();

  if (opts.from && opts.to) {
    return { from: new Date(opts.from), to: new Date(opts.to) };
  }

  const rangeMs: Record<string, number> = {
    "15m": 15 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
  };

  const ms = rangeMs[opts.timeRange ?? "1h"] ?? rangeMs["1h"];
  return { from: new Date(now.getTime() - ms!), to: now };
}

function getAttr(attrs: Record<string, unknown>, key: string): string | undefined {
  const val = attrs[key];
  return val !== undefined && val !== null ? String(val) : undefined;
}

function getNumAttr(attrs: Record<string, unknown>, key: string): number | undefined {
  const val = attrs[key];
  if (val === undefined || val === null) return undefined;
  const num = Number(val);
  return Number.isNaN(num) ? undefined : num;
}

function extractRequestMetadata(attrs: Record<string, unknown>): Record<string, string> {
  const prefix = "gen_ai.request.metadata.";
  const metadata: Record<string, string> = {};
  for (const key of Object.keys(attrs)) {
    if (key.startsWith(prefix)) {
      metadata[key.slice(prefix.length)] = String(attrs[key]);
    }
  }
  return metadata;
}

function parseJsonAttr(attrs: Record<string, unknown>, key: string): unknown {
  const val = attrs[key];
  if (val === undefined || val === null) return undefined;
  if (typeof val === "object") return val;
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
}

function parseDurationMs(startTime: string, endTime: string): number {
  return new Date(endTime).getTime() - new Date(startTime).getTime();
}

function rowToSummary(row: Record<string, unknown>): TraceSummary {
  const attrs = (typeof row.span_attributes === "string"
    ? JSON.parse(row.span_attributes)
    : row.span_attributes ?? {}) as Record<string, unknown>;

  const startTime = String(row.start_time);
  const endTime = String(row.end_time);

  return {
    traceId: String(row.trace_id),
    spanId: String(row.span_id),
    operationName: String(row.span_name),
    model: getAttr(attrs, "gen_ai.request.model"),
    status: String(row.status_code ?? "UNSET"),
    durationMs: parseDurationMs(startTime, endTime),
    startTime,
  };
}

function rowToDetail(row: Record<string, unknown>): TraceDetail {
  const attrs = (typeof row.span_attributes === "string"
    ? JSON.parse(row.span_attributes)
    : row.span_attributes ?? {}) as Record<string, unknown>;

  const startTime = String(row.start_time);
  const endTime = String(row.end_time);

  const inputTokens = getNumAttr(attrs, "gen_ai.usage.input_tokens");
  const outputTokens = getNumAttr(attrs, "gen_ai.usage.output_tokens");

  return {
    traceId: String(row.trace_id),
    spanId: String(row.span_id),
    operationName: String(row.span_name),
    startTime,
    endTime,
    durationMs: parseDurationMs(startTime, endTime),
    status: String(row.status_code ?? "UNSET"),
    model: getAttr(attrs, "gen_ai.request.model"),
    provider: getAttr(attrs, "gen_ai.system"),
    inputTokens,
    outputTokens,
    totalTokens: inputTokens !== undefined && outputTokens !== undefined ? inputTokens + outputTokens : undefined,
    finishReason: getAttr(attrs, "gen_ai.response.finish_reasons"),
    inputMessages: parseJsonAttr(attrs, "gen_ai.request.messages"),
    outputContent: parseJsonAttr(attrs, "gen_ai.response.text") ?? parseJsonAttr(attrs, "gen_ai.completion"),
    tools: parseJsonAttr(attrs, "gen_ai.request.tools"),
    toolCalls: parseJsonAttr(attrs, "gen_ai.response.tool_calls"),
    requestMetadata: extractRequestMetadata(attrs),
    agentSlug: getAttr(attrs, "hebo.agent.slug"),
    branchSlug: getAttr(attrs, "hebo.branch.slug"),
    rawAttributes: attrs,
  };
}

export async function listTraces(opts: {
  agentSlug: string;
  branchSlug: string;
  from?: string;
  to?: string;
  timeRange?: string;
  page: number;
  pageSize: number;
  metadata?: Record<string, string>;
}) {
  const { from, to } = resolveTimeRange(opts);
  const offset = (opts.page - 1) * opts.pageSize;

  // Build metadata filter conditions
  let metadataFilter = "";
  const metadataValues: string[] = [];
  if (opts.metadata) {
    for (const [key, value] of Object.entries(opts.metadata)) {
      metadataFilter += ` AND span_attributes['gen_ai.request.metadata.${key}'] = $${metadataValues.length + 5}`;
      metadataValues.push(value);
    }
  }

  const baseQuery = `
    FROM opentelemetry_traces
    WHERE resource_attributes['service.name'] = 'hebo-gateway'
      AND span_attributes['hebo.agent.slug'] = $1
      AND span_attributes['hebo.branch.slug'] = $2
      AND span_name LIKE 'gen_ai%'
      AND start_time >= $3
      AND start_time <= $4
      ${metadataFilter}
  `;

  const params = [opts.agentSlug, opts.branchSlug, from, to, ...metadataValues];

  const [rows, countResult] = await Promise.all([
    greptimeDb.unsafe(
      `SELECT trace_id, span_id, span_name, start_time, end_time, span_attributes, status_code
       ${baseQuery}
       ORDER BY start_time DESC
       LIMIT ${opts.pageSize} OFFSET ${offset}`,
      params,
    ),
    greptimeDb.unsafe(
      `SELECT COUNT(*) as total ${baseQuery}`,
      params,
    ),
  ]);

  return {
    data: (rows as Record<string, unknown>[]).map(rowToSummary),
    total: Number((countResult as Record<string, unknown>[])[0]?.total ?? 0),
    page: opts.page,
    pageSize: opts.pageSize,
  };
}

export async function getTrace(opts: {
  agentSlug: string;
  branchSlug: string;
  traceId: string;
}): Promise<TraceDetail | undefined> {
  const rows = await greptimeDb.unsafe(
    `SELECT trace_id, span_id, span_name, start_time, end_time, span_attributes, resource_attributes, status_code
     FROM opentelemetry_traces
     WHERE resource_attributes['service.name'] = 'hebo-gateway'
       AND span_attributes['hebo.agent.slug'] = $1
       AND span_attributes['hebo.branch.slug'] = $2
       AND trace_id = $3
       AND span_name LIKE 'gen_ai%'
     LIMIT 1`,
    [opts.agentSlug, opts.branchSlug, opts.traceId],
  );

  const row = (rows as Record<string, unknown>[])[0];
  return row ? rowToDetail(row) : undefined;
}

export async function listMetadataKeys(opts: {
  agentSlug: string;
  branchSlug: string;
  from?: string;
  to?: string;
  timeRange?: string;
}): Promise<string[]> {
  const { from, to } = resolveTimeRange(opts);

  const rows = await greptimeDb.unsafe(
    `SELECT DISTINCT json_object_keys(span_attributes) as key_name
     FROM opentelemetry_traces
     WHERE resource_attributes['service.name'] = 'hebo-gateway'
       AND span_attributes['hebo.agent.slug'] = $1
       AND span_attributes['hebo.branch.slug'] = $2
       AND span_name LIKE 'gen_ai%'
       AND start_time >= $3
       AND start_time <= $4`,
    [opts.agentSlug, opts.branchSlug, from, to],
  );

  const prefix = "gen_ai.request.metadata.";
  return (rows as Record<string, unknown>[])
    .map((r) => String(r.key_name))
    .filter((k) => k.startsWith(prefix))
    .map((k) => k.slice(prefix.length));
}
