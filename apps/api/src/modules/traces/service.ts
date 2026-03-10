import { SQL } from "bun";

import type { TraceDetail, TraceListItem } from "./types";

const greptimeDb = new SQL({
  url: process.env.GREPTIME_PG_URL ?? "postgres://localhost:4003/public",
});

function parseSpanAttributes(raw: unknown): Record<string, unknown> {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return (raw as Record<string, unknown>) ?? {};
}

function extractGenAiAttribute(attrs: Record<string, unknown>, key: string): string | undefined {
  const val = attrs[key];
  return val != null ? String(val) : undefined;
}

function extractMetadata(attrs: Record<string, unknown>): Record<string, string> {
  const metadata: Record<string, string> = {};
  const prefix = "gen_ai.request.metadata.";
  for (const [key, val] of Object.entries(attrs)) {
    if (key.startsWith(prefix) && val != null) {
      metadata[key.slice(prefix.length)] = String(val);
    }
  }
  return metadata;
}

export async function listTraces(opts: {
  agentSlug: string;
  branchSlug: string;
  from: Date;
  to: Date;
  limit: number;
  offset: number;
  metadataFilters?: Record<string, string>;
}): Promise<{ data: TraceListItem[]; total: number }> {
  let metadataConditions = "";
  const metadataValues: string[] = [];

  if (opts.metadataFilters) {
    for (const [key, value] of Object.entries(opts.metadataFilters)) {
      metadataConditions += ` AND span_attributes['gen_ai.request.metadata.${key}'] = '${value.replace(/'/g, "''")}'`;
    }
  }

  const countResult = await greptimeDb.unsafe(`
    SELECT COUNT(*) as total
    FROM opentelemetry_traces
    WHERE resource_attributes['service.name'] = 'hebo-gateway'
      AND span_attributes['hebo.agent.slug'] = '${opts.agentSlug}'
      AND span_attributes['hebo.branch.slug'] = '${opts.branchSlug}'
      AND span_name LIKE 'gen_ai%'
      AND start_time >= '${opts.from.toISOString()}'
      AND start_time <= '${opts.to.toISOString()}'
      ${metadataConditions}
  `);

  const total = Number(countResult[0]?.total ?? 0);

  const rows = await greptimeDb.unsafe(`
    SELECT trace_id, span_id, span_name, start_time, end_time,
           span_attributes, resource_attributes, status_code
    FROM opentelemetry_traces
    WHERE resource_attributes['service.name'] = 'hebo-gateway'
      AND span_attributes['hebo.agent.slug'] = '${opts.agentSlug}'
      AND span_attributes['hebo.branch.slug'] = '${opts.branchSlug}'
      AND span_name LIKE 'gen_ai%'
      AND start_time >= '${opts.from.toISOString()}'
      AND start_time <= '${opts.to.toISOString()}'
      ${metadataConditions}
    ORDER BY start_time DESC
    LIMIT ${opts.limit} OFFSET ${opts.offset}
  `);

  const data: TraceListItem[] = rows.map((row: any) => {
    const attrs = parseSpanAttributes(row.span_attributes);
    const start = new Date(row.start_time);
    const end = new Date(row.end_time);

    return {
      traceId: row.trace_id,
      spanId: row.span_id,
      operationName: row.span_name,
      model: extractGenAiAttribute(attrs, "gen_ai.request.model") ?? "",
      status: row.status_code ?? "OK",
      startTime: start.toISOString(),
      duration: end.getTime() - start.getTime(),
    };
  });

  return { data, total };
}

export async function getTraceDetail(opts: {
  agentSlug: string;
  branchSlug: string;
  traceId: string;
}): Promise<TraceDetail | null> {
  const rows = await greptimeDb.unsafe(`
    SELECT trace_id, span_id, span_name, start_time, end_time,
           span_attributes, resource_attributes, status_code
    FROM opentelemetry_traces
    WHERE trace_id = '${opts.traceId}'
      AND resource_attributes['service.name'] = 'hebo-gateway'
      AND span_attributes['hebo.agent.slug'] = '${opts.agentSlug}'
      AND span_attributes['hebo.branch.slug'] = '${opts.branchSlug}'
    LIMIT 1
  `);

  if (!rows.length) return null;

  const row = rows[0] as any;
  const attrs = parseSpanAttributes(row.span_attributes);
  const resourceAttrs = parseSpanAttributes(row.resource_attributes);
  const start = new Date(row.start_time);
  const end = new Date(row.end_time);

  let inputMessages: unknown;
  try {
    const raw = attrs["gen_ai.request.messages"];
    inputMessages = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {}

  let outputContent: unknown;
  try {
    const raw = attrs["gen_ai.response.text"] ?? attrs["gen_ai.completion"];
    outputContent = typeof raw === "string" ? raw : undefined;
  } catch {}

  let toolDefinitions: unknown;
  try {
    const raw = attrs["gen_ai.request.tools"];
    toolDefinitions = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {}

  let toolCalls: unknown;
  try {
    const raw = attrs["gen_ai.response.tool_calls"];
    toolCalls = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {}

  const inputTokens = attrs["gen_ai.usage.input_tokens"];
  const outputTokens = attrs["gen_ai.usage.output_tokens"];

  return {
    traceId: row.trace_id,
    spanId: row.span_id,
    operationName: row.span_name,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    duration: end.getTime() - start.getTime(),
    status: row.status_code ?? "OK",
    model: extractGenAiAttribute(attrs, "gen_ai.request.model") ?? "",
    provider: extractGenAiAttribute(attrs, "gen_ai.system") ?? "",
    inputTokens: inputTokens != null ? Number(inputTokens) : undefined,
    outputTokens: outputTokens != null ? Number(outputTokens) : undefined,
    totalTokens:
      inputTokens != null && outputTokens != null
        ? Number(inputTokens) + Number(outputTokens)
        : undefined,
    finishReason: extractGenAiAttribute(attrs, "gen_ai.response.finish_reasons"),
    inputMessages,
    outputContent,
    toolDefinitions,
    toolCalls,
    requestMetadata: extractMetadata(attrs),
    agentSlug: opts.agentSlug,
    branchSlug: opts.branchSlug,
    rawSpanAttributes: attrs,
    rawResourceAttributes: resourceAttrs,
  };
}

export async function getMetadataKeys(opts: {
  agentSlug: string;
  branchSlug: string;
  from: Date;
  to: Date;
}): Promise<string[]> {
  const rows = await greptimeDb.unsafe(`
    SELECT DISTINCT span_attributes
    FROM opentelemetry_traces
    WHERE resource_attributes['service.name'] = 'hebo-gateway'
      AND span_attributes['hebo.agent.slug'] = '${opts.agentSlug}'
      AND span_attributes['hebo.branch.slug'] = '${opts.branchSlug}'
      AND span_name LIKE 'gen_ai%'
      AND start_time >= '${opts.from.toISOString()}'
      AND start_time <= '${opts.to.toISOString()}'
    LIMIT 100
  `);

  const prefix = "gen_ai.request.metadata.";
  const keys = new Set<string>();

  for (const row of rows) {
    const attrs = parseSpanAttributes((row as any).span_attributes);
    for (const key of Object.keys(attrs)) {
      if (key.startsWith(prefix)) {
        keys.add(key.slice(prefix.length));
      }
    }
  }

  return [...keys].sort();
}

export async function getMetadataValues(opts: {
  agentSlug: string;
  branchSlug: string;
  from: Date;
  to: Date;
  key: string;
}): Promise<string[]> {
  const attrKey = `gen_ai.request.metadata.${opts.key}`;

  const rows = await greptimeDb.unsafe(`
    SELECT DISTINCT span_attributes['${attrKey}'] as val
    FROM opentelemetry_traces
    WHERE resource_attributes['service.name'] = 'hebo-gateway'
      AND span_attributes['hebo.agent.slug'] = '${opts.agentSlug}'
      AND span_attributes['hebo.branch.slug'] = '${opts.branchSlug}'
      AND span_name LIKE 'gen_ai%'
      AND start_time >= '${opts.from.toISOString()}'
      AND start_time <= '${opts.to.toISOString()}'
      AND span_attributes['${attrKey}'] IS NOT NULL
    LIMIT 50
  `);

  return rows.map((r: any) => String(r.val)).filter(Boolean);
}
