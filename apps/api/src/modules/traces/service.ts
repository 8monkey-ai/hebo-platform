import { SQL } from "bun";

const greptimePgUrl = process.env.GREPTIME_PG_URL ?? "postgres://localhost:4003/public";

let db: InstanceType<typeof SQL> | undefined;

function getDb() {
  if (!db) {
    db = new SQL({ url: greptimePgUrl });
  }
  return db;
}

function resolveTimeRange(opts: { from?: string; to?: string; timeRange?: string }) {
  const now = new Date();
  let from: Date;
  let to: Date = opts.to ? new Date(opts.to) : now;

  if (opts.from) {
    from = new Date(opts.from);
  } else {
    const presetMs: Record<string, number> = {
      "15m": 15 * 60 * 1000,
      "1h": 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
    };
    const ms = presetMs[opts.timeRange ?? "1h"] ?? presetMs["1h"];
    from = new Date(to.getTime() - ms);
  }

  return { from, to };
}

type SpanRow = {
  trace_id: string;
  span_id: string;
  span_name: string;
  start_time: string;
  end_time: string;
  status_code: string;
  span_attributes: Record<string, unknown>;
  resource_attributes: Record<string, unknown>;
};

function parseSpanAttributes(attrs: Record<string, unknown>) {
  const str = (key: string) => (attrs[key] as string) ?? "";
  const num = (key: string) => {
    const v = attrs[key];
    return typeof v === "number" ? v : v != null ? Number(v) : null;
  };

  const requestMetadata: Record<string, string> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith("gen_ai.request.metadata.")) {
      requestMetadata[key.replace("gen_ai.request.metadata.", "")] = String(value);
    }
  }

  return {
    model: str("gen_ai.request.model"),
    provider: str("gen_ai.system"),
    inputTokens: num("gen_ai.usage.input_tokens"),
    outputTokens: num("gen_ai.usage.output_tokens"),
    totalTokens: num("gen_ai.usage.total_tokens"),
    finishReason: str("gen_ai.response.finish_reasons"),
    input: attrs["gen_ai.request.messages"] ?? attrs["gen_ai.prompt"] ?? null,
    output: attrs["gen_ai.response.text"] ?? attrs["gen_ai.completion"] ?? null,
    toolCalls: attrs["gen_ai.response.tool_calls"] ?? null,
    toolDefinitions: attrs["gen_ai.request.tools"] ?? null,
    requestMetadata,
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
  const sql = getDb();
  const { from, to } = resolveTimeRange(opts);
  const offset = (opts.page - 1) * opts.pageSize;

  let metadataFilter = "";
  const metadataEntries = Object.entries(opts.metadata ?? {});
  for (let i = 0; i < metadataEntries.length; i++) {
    const [key, value] = metadataEntries[i]!;
    metadataFilter += ` AND json_extract_string(span_attributes, '$.gen_ai.request.metadata.${key}') = '${value.replace(/'/g, "''")}'`;
  }

  const countResult = await sql.unsafe(`
    SELECT COUNT(*) as total
    FROM opentelemetry_traces
    WHERE resource_attributes['service.name'] = 'hebo-gateway'
      AND json_extract_string(span_attributes, '$."hebo.agent.slug"') = '${opts.agentSlug.replace(/'/g, "''")}'
      AND json_extract_string(span_attributes, '$."hebo.branch.slug"') = '${opts.branchSlug.replace(/'/g, "''")}'
      AND span_name LIKE 'gen_ai%'
      AND start_time >= '${from.toISOString()}'
      AND start_time <= '${to.toISOString()}'
      ${metadataFilter}
  `);

  const total = Number(countResult[0]?.total ?? 0);

  const rows: SpanRow[] = await sql.unsafe(`
    SELECT trace_id, span_id, span_name, start_time, end_time,
           status_code, span_attributes, resource_attributes
    FROM opentelemetry_traces
    WHERE resource_attributes['service.name'] = 'hebo-gateway'
      AND json_extract_string(span_attributes, '$."hebo.agent.slug"') = '${opts.agentSlug.replace(/'/g, "''")}'
      AND json_extract_string(span_attributes, '$."hebo.branch.slug"') = '${opts.branchSlug.replace(/'/g, "''")}'
      AND span_name LIKE 'gen_ai%'
      AND start_time >= '${from.toISOString()}'
      AND start_time <= '${to.toISOString()}'
      ${metadataFilter}
    ORDER BY start_time DESC
    LIMIT ${opts.pageSize} OFFSET ${offset}
  `);

  const data = rows.map((row) => {
    const attrs = typeof row.span_attributes === "string"
      ? JSON.parse(row.span_attributes)
      : row.span_attributes ?? {};
    const parsed = parseSpanAttributes(attrs);
    const startMs = new Date(row.start_time).getTime();
    const endMs = new Date(row.end_time).getTime();

    return {
      traceId: row.trace_id,
      spanId: row.span_id,
      operationName: row.span_name,
      model: parsed.model,
      status: row.status_code ?? "OK",
      durationMs: endMs - startMs,
      startTime: row.start_time,
    };
  });

  return { data, total, page: opts.page, pageSize: opts.pageSize };
}

export async function getTrace(opts: {
  agentSlug: string;
  branchSlug: string;
  traceId: string;
}) {
  const sql = getDb();

  const rows: SpanRow[] = await sql.unsafe(`
    SELECT trace_id, span_id, span_name, start_time, end_time,
           status_code, span_attributes, resource_attributes
    FROM opentelemetry_traces
    WHERE trace_id = '${opts.traceId.replace(/'/g, "''")}'
      AND json_extract_string(span_attributes, '$."hebo.agent.slug"') = '${opts.agentSlug.replace(/'/g, "''")}'
      AND json_extract_string(span_attributes, '$."hebo.branch.slug"') = '${opts.branchSlug.replace(/'/g, "''")}'
    LIMIT 1
  `);

  if (rows.length === 0) return null;

  const row = rows[0]!;
  const attrs = typeof row.span_attributes === "string"
    ? JSON.parse(row.span_attributes)
    : row.span_attributes ?? {};
  const parsed = parseSpanAttributes(attrs);
  const startMs = new Date(row.start_time).getTime();
  const endMs = new Date(row.end_time).getTime();

  return {
    traceId: row.trace_id,
    spanId: row.span_id,
    operationName: row.span_name,
    startTime: row.start_time,
    endTime: row.end_time,
    durationMs: endMs - startMs,
    status: row.status_code ?? "OK",
    ...parsed,
    raw: { span_attributes: attrs, resource_attributes: row.resource_attributes },
  };
}

export async function getMetadataKeys(opts: {
  agentSlug: string;
  branchSlug: string;
  from?: string;
  to?: string;
  timeRange?: string;
}) {
  const sql = getDb();
  const { from, to } = resolveTimeRange(opts);

  const rows: Array<{ span_attributes: Record<string, unknown> }> = await sql.unsafe(`
    SELECT span_attributes
    FROM opentelemetry_traces
    WHERE resource_attributes['service.name'] = 'hebo-gateway'
      AND json_extract_string(span_attributes, '$."hebo.agent.slug"') = '${opts.agentSlug.replace(/'/g, "''")}'
      AND json_extract_string(span_attributes, '$."hebo.branch.slug"') = '${opts.branchSlug.replace(/'/g, "''")}'
      AND span_name LIKE 'gen_ai%'
      AND start_time >= '${from.toISOString()}'
      AND start_time <= '${to.toISOString()}'
    LIMIT 100
  `);

  const keys = new Set<string>();
  for (const row of rows) {
    const attrs = typeof row.span_attributes === "string"
      ? JSON.parse(row.span_attributes)
      : row.span_attributes ?? {};
    for (const key of Object.keys(attrs)) {
      if (key.startsWith("gen_ai.request.metadata.")) {
        keys.add(key.replace("gen_ai.request.metadata.", ""));
      }
    }
  }

  return [...keys].sort();
}
