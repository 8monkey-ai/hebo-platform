import { SQL } from "bun";

const greptimeDb = new SQL({
  url: process.env.GREPTIME_PG_URL ?? "postgres://localhost:4003/public",
});

function parseSpanAttributes(attrs: unknown): Record<string, unknown> {
  if (typeof attrs === "string") {
    try {
      return JSON.parse(attrs);
    } catch {
      return {};
    }
  }
  return (attrs as Record<string, unknown>) ?? {};
}

function extractGenAiField(attrs: Record<string, unknown>, key: string): unknown {
  return attrs[key] ?? null;
}

function extractMetadata(attrs: Record<string, unknown>): Record<string, unknown> {
  const metadata: Record<string, unknown> = {};
  const prefix = "gen_ai.request.metadata.";
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith(prefix)) {
      metadata[key.slice(prefix.length)] = value;
    }
  }
  return metadata;
}

export async function listTraces(opts: {
  agentSlug: string;
  branchSlug: string;
  from: Date;
  to: Date;
  page: number;
  pageSize: number;
  metadata?: Record<string, string>;
}) {
  const metadataFilters = Object.entries(opts.metadata ?? {});

  // Build dynamic WHERE clauses for metadata filters
  let metadataWhere = "";
  const metadataValues: string[] = [];
  for (const [key, value] of metadataFilters) {
    metadataWhere += ` AND span_attributes['gen_ai.request.metadata.${key}'] = $${metadataValues.length + 6}`;
    metadataValues.push(value);
  }

  const offset = (opts.page - 1) * opts.pageSize;

  // Use tagged template for the base query, but we need dynamic metadata filters
  // so we use a raw query approach
  const rows = await greptimeDb.unsafe(
    `SELECT trace_id, span_id, span_name, start_time, end_time,
            span_attributes, resource_attributes, status_code
     FROM opentelemetry_traces
     WHERE resource_attributes['service.name'] = $1
       AND span_attributes['hebo.agent.slug'] = $2
       AND span_attributes['hebo.branch.slug'] = $3
       AND span_name LIKE 'gen_ai%'
       AND start_time >= $4
       AND start_time <= $5
       ${metadataWhere}
     ORDER BY start_time DESC
     LIMIT $${metadataValues.length + 6} OFFSET $${metadataValues.length + 7}`,
    [
      "hebo-gateway",
      opts.agentSlug,
      opts.branchSlug,
      opts.from.toISOString(),
      opts.to.toISOString(),
      ...metadataValues,
      opts.pageSize,
      offset,
    ],
  );

  const countResult = await greptimeDb.unsafe(
    `SELECT COUNT(*) as total
     FROM opentelemetry_traces
     WHERE resource_attributes['service.name'] = $1
       AND span_attributes['hebo.agent.slug'] = $2
       AND span_attributes['hebo.branch.slug'] = $3
       AND span_name LIKE 'gen_ai%'
       AND start_time >= $4
       AND start_time <= $5
       ${metadataWhere}`,
    [
      "hebo-gateway",
      opts.agentSlug,
      opts.branchSlug,
      opts.from.toISOString(),
      opts.to.toISOString(),
      ...metadataValues,
    ],
  );

  const total = Number(countResult[0]?.total ?? 0);

  const data = rows.map((row: Record<string, unknown>) => {
    const attrs = parseSpanAttributes(row.span_attributes);
    const startTime = new Date(row.start_time as string);
    const endTime = new Date(row.end_time as string);
    return {
      traceId: row.trace_id,
      spanId: row.span_id,
      operationName: row.span_name,
      model: extractGenAiField(attrs, "gen_ai.request.model") ?? "",
      status: row.status_code === 0 || row.status_code === "STATUS_CODE_OK" ? "ok" : "error",
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationMs: endTime.getTime() - startTime.getTime(),
      spanAttributes: attrs,
      resourceAttributes: parseSpanAttributes(row.resource_attributes),
    };
  });

  return { data, total, page: opts.page, pageSize: opts.pageSize };
}

export async function getTrace(opts: {
  agentSlug: string;
  branchSlug: string;
  traceId: string;
}) {
  const rows = await greptimeDb.unsafe(
    `SELECT trace_id, span_id, span_name, start_time, end_time,
            span_attributes, resource_attributes, status_code
     FROM opentelemetry_traces
     WHERE trace_id = $1
       AND span_attributes['hebo.agent.slug'] = $2
       AND span_attributes['hebo.branch.slug'] = $3
     LIMIT 1`,
    [opts.traceId, opts.agentSlug, opts.branchSlug],
  );

  if (rows.length === 0) return null;

  const row = rows[0] as Record<string, unknown>;
  const attrs = parseSpanAttributes(row.span_attributes);
  const startTime = new Date(row.start_time as string);
  const endTime = new Date(row.end_time as string);

  return {
    traceId: row.trace_id,
    spanId: row.span_id,
    operationName: row.span_name,
    model: extractGenAiField(attrs, "gen_ai.request.model") ?? "",
    provider: extractGenAiField(attrs, "gen_ai.system") ?? "",
    status: row.status_code === 0 || row.status_code === "STATUS_CODE_OK" ? "ok" : "error",
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    durationMs: endTime.getTime() - startTime.getTime(),
    inputTokens: extractGenAiField(attrs, "gen_ai.usage.input_tokens") as number | null,
    outputTokens: extractGenAiField(attrs, "gen_ai.usage.output_tokens") as number | null,
    totalTokens: extractGenAiField(attrs, "gen_ai.usage.total_tokens") as number | null,
    finishReason: extractGenAiField(attrs, "gen_ai.response.finish_reasons") as string | null,
    inputMessages: extractGenAiField(attrs, "gen_ai.request.messages"),
    outputContent: extractGenAiField(attrs, "gen_ai.response.text"),
    toolCalls: extractGenAiField(attrs, "gen_ai.response.tool_calls"),
    toolDefinitions: extractGenAiField(attrs, "gen_ai.request.tools"),
    requestMetadata: extractMetadata(attrs),
    spanAttributes: attrs,
    resourceAttributes: parseSpanAttributes(row.resource_attributes),
  };
}

export async function getMetadataKeys(opts: {
  agentSlug: string;
  branchSlug: string;
  from: Date;
  to: Date;
}): Promise<string[]> {
  const rows = await greptimeDb.unsafe(
    `SELECT DISTINCT span_attributes
     FROM opentelemetry_traces
     WHERE resource_attributes['service.name'] = $1
       AND span_attributes['hebo.agent.slug'] = $2
       AND span_attributes['hebo.branch.slug'] = $3
       AND span_name LIKE 'gen_ai%'
       AND start_time >= $4
       AND start_time <= $5
     LIMIT 100`,
    [
      "hebo-gateway",
      opts.agentSlug,
      opts.branchSlug,
      opts.from.toISOString(),
      opts.to.toISOString(),
    ],
  );

  const keys = new Set<string>();
  const prefix = "gen_ai.request.metadata.";
  for (const row of rows) {
    const attrs = parseSpanAttributes(row.span_attributes);
    for (const key of Object.keys(attrs)) {
      if (key.startsWith(prefix)) {
        keys.add(key.slice(prefix.length));
      }
    }
  }

  return Array.from(keys).sort();
}

export async function getMetadataValues(opts: {
  agentSlug: string;
  branchSlug: string;
  from: Date;
  to: Date;
  key: string;
}): Promise<string[]> {
  const attrKey = `gen_ai.request.metadata.${opts.key}`;
  const rows = await greptimeDb.unsafe(
    `SELECT DISTINCT span_attributes['${attrKey}'] as val
     FROM opentelemetry_traces
     WHERE resource_attributes['service.name'] = $1
       AND span_attributes['hebo.agent.slug'] = $2
       AND span_attributes['hebo.branch.slug'] = $3
       AND span_name LIKE 'gen_ai%'
       AND start_time >= $4
       AND start_time <= $5
     LIMIT 50`,
    [
      "hebo-gateway",
      opts.agentSlug,
      opts.branchSlug,
      opts.from.toISOString(),
      opts.to.toISOString(),
    ],
  );

  return rows.map((r: Record<string, unknown>) => String(r.val)).filter(Boolean);
}
