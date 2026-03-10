import { SQL } from "bun";

import { getSecret } from "@hebo/shared-api/utils/secrets";

const greptimePgUrl = (await getSecret("GreptimePgUrl")) ?? "postgres://localhost:4003/public";

const greptimeDb = new SQL(greptimePgUrl);

function resolveTimeRange(opts: {
  from?: string;
  to?: string;
  timeRange?: string;
}): { from: Date; to: Date } {
  const to = opts.to ? new Date(opts.to) : new Date();
  if (opts.from) {
    return { from: new Date(opts.from), to };
  }

  const presetMs: Record<string, number> = {
    "15m": 15 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
  };
  const ms = presetMs[opts.timeRange ?? "1h"] ?? presetMs["1h"]!;
  return { from: new Date(to.getTime() - ms), to };
}

type SpanRow = {
  trace_id: string;
  span_id: string;
  span_name: string;
  start_time: string;
  end_time: string;
  status_code: number;
  span_attributes: Record<string, unknown>;
  resource_attributes: Record<string, unknown>;
};

function parseSpanAttributes(attrs: Record<string, unknown>) {
  const get = (key: string) => attrs[key] as string | undefined;
  const getNum = (key: string) => {
    const v = attrs[key];
    return v !== undefined ? Number(v) : undefined;
  };

  const requestMetadata: Record<string, string> = {};
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith("gen_ai.request.metadata.")) {
      requestMetadata[k.replace("gen_ai.request.metadata.", "")] = String(v);
    }
  }

  let inputMessages: unknown;
  const rawInput = attrs["gen_ai.request.messages"];
  if (typeof rawInput === "string") {
    try {
      inputMessages = JSON.parse(rawInput);
    } catch {
      inputMessages = rawInput;
    }
  } else if (rawInput) {
    inputMessages = rawInput;
  }

  let outputContent: unknown;
  const rawOutput = attrs["gen_ai.response.text"] ?? attrs["gen_ai.completion"];
  if (typeof rawOutput === "string") {
    try {
      outputContent = JSON.parse(rawOutput);
    } catch {
      outputContent = rawOutput;
    }
  } else if (rawOutput) {
    outputContent = rawOutput;
  }

  let toolCalls: unknown;
  const rawToolCalls = attrs["gen_ai.response.tool_calls"];
  if (typeof rawToolCalls === "string") {
    try {
      toolCalls = JSON.parse(rawToolCalls);
    } catch {
      toolCalls = rawToolCalls;
    }
  } else if (rawToolCalls) {
    toolCalls = rawToolCalls;
  }

  let toolDefinitions: unknown;
  const rawToolDefs = attrs["gen_ai.request.tools"];
  if (typeof rawToolDefs === "string") {
    try {
      toolDefinitions = JSON.parse(rawToolDefs);
    } catch {
      toolDefinitions = rawToolDefs;
    }
  } else if (rawToolDefs) {
    toolDefinitions = rawToolDefs;
  }

  return {
    model: get("gen_ai.request.model") ?? get("gen_ai.response.model") ?? "",
    provider: get("gen_ai.system") ?? "",
    inputTokens: getNum("gen_ai.usage.input_tokens"),
    outputTokens: getNum("gen_ai.usage.output_tokens"),
    totalTokens: getNum("gen_ai.usage.total_tokens"),
    finishReason: get("gen_ai.response.finish_reasons") ?? get("gen_ai.response.finish_reason"),
    inputMessages,
    outputContent,
    toolCalls,
    toolDefinitions,
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
  metadataFilters: Record<string, string>;
}) {
  const { from, to } = resolveTimeRange(opts);
  const offset = (opts.page - 1) * opts.pageSize;

  // Build metadata filter conditions
  let metadataConditions = "";
  const metadataEntries = Object.entries(opts.metadataFilters);
  for (const [key, value] of metadataEntries) {
    metadataConditions += ` AND span_attributes['gen_ai.request.metadata.${key}'] = '${value.replace(/'/g, "''")}'`;
  }

  const countResult = await greptimeDb.unsafe(`
    SELECT COUNT(*) as total
    FROM opentelemetry_traces
    WHERE resource_attributes['service.name'] = 'hebo-gateway'
      AND span_attributes['hebo.agent.slug'] = '${opts.agentSlug}'
      AND span_attributes['hebo.branch.slug'] = '${opts.branchSlug}'
      AND span_name LIKE 'gen_ai%'
      AND start_time >= '${from.toISOString()}'
      AND start_time <= '${to.toISOString()}'
      ${metadataConditions}
  `);

  const total = Number(countResult[0]?.total ?? 0);

  const rows = (await greptimeDb.unsafe(`
    SELECT trace_id, span_id, span_name, start_time, end_time,
           status_code, span_attributes, resource_attributes
    FROM opentelemetry_traces
    WHERE resource_attributes['service.name'] = 'hebo-gateway'
      AND span_attributes['hebo.agent.slug'] = '${opts.agentSlug}'
      AND span_attributes['hebo.branch.slug'] = '${opts.branchSlug}'
      AND span_name LIKE 'gen_ai%'
      AND start_time >= '${from.toISOString()}'
      AND start_time <= '${to.toISOString()}'
      ${metadataConditions}
    ORDER BY start_time DESC
    LIMIT ${opts.pageSize} OFFSET ${offset}
  `)) as SpanRow[];

  const data = rows.map((row) => {
    const attrs = typeof row.span_attributes === "string"
      ? JSON.parse(row.span_attributes)
      : row.span_attributes ?? {};
    const parsed = parseSpanAttributes(attrs);
    const start = new Date(row.start_time);
    const end = new Date(row.end_time);

    return {
      traceId: row.trace_id,
      spanId: row.span_id,
      operationName: row.span_name,
      model: parsed.model,
      statusCode: row.status_code ?? 0,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      durationMs: end.getTime() - start.getTime(),
    };
  });

  return { data, total, page: opts.page, pageSize: opts.pageSize };
}

export async function getTrace(opts: {
  agentSlug: string;
  branchSlug: string;
  traceId: string;
}) {
  const rows = (await greptimeDb.unsafe(`
    SELECT trace_id, span_id, span_name, start_time, end_time,
           status_code, span_attributes, resource_attributes
    FROM opentelemetry_traces
    WHERE trace_id = '${opts.traceId}'
      AND resource_attributes['service.name'] = 'hebo-gateway'
      AND span_attributes['hebo.agent.slug'] = '${opts.agentSlug}'
      AND span_attributes['hebo.branch.slug'] = '${opts.branchSlug}'
    LIMIT 1
  `)) as SpanRow[];

  if (rows.length === 0) return null;

  const row = rows[0]!;
  const attrs = typeof row.span_attributes === "string"
    ? JSON.parse(row.span_attributes)
    : row.span_attributes ?? {};
  const parsed = parseSpanAttributes(attrs);
  const start = new Date(row.start_time);
  const end = new Date(row.end_time);

  return {
    traceId: row.trace_id,
    spanId: row.span_id,
    operationName: row.span_name,
    model: parsed.model,
    provider: parsed.provider,
    statusCode: row.status_code ?? 0,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    durationMs: end.getTime() - start.getTime(),
    inputTokens: parsed.inputTokens,
    outputTokens: parsed.outputTokens,
    totalTokens: parsed.totalTokens,
    finishReason: parsed.finishReason,
    inputMessages: parsed.inputMessages,
    outputContent: parsed.outputContent,
    toolCalls: parsed.toolCalls,
    toolDefinitions: parsed.toolDefinitions,
    requestMetadata: parsed.requestMetadata,
    rawAttributes: attrs,
  };
}

export async function getMetadataKeys(opts: {
  agentSlug: string;
  branchSlug: string;
  from?: string;
  to?: string;
  timeRange?: string;
}) {
  const { from, to } = resolveTimeRange(opts);

  const rows = (await greptimeDb.unsafe(`
    SELECT DISTINCT json_object_keys(span_attributes) as key_name
    FROM opentelemetry_traces
    WHERE resource_attributes['service.name'] = 'hebo-gateway'
      AND span_attributes['hebo.agent.slug'] = '${opts.agentSlug}'
      AND span_attributes['hebo.branch.slug'] = '${opts.branchSlug}'
      AND span_name LIKE 'gen_ai%'
      AND start_time >= '${from.toISOString()}'
      AND start_time <= '${to.toISOString()}'
  `)) as { key_name: string }[];

  const prefix = "gen_ai.request.metadata.";
  return rows
    .map((r) => r.key_name)
    .filter((k) => k.startsWith(prefix))
    .map((k) => k.slice(prefix.length));
}

export async function getMetadataValues(opts: {
  agentSlug: string;
  branchSlug: string;
  key: string;
  from?: string;
  to?: string;
  timeRange?: string;
}) {
  const { from, to } = resolveTimeRange(opts);
  const attrKey = `gen_ai.request.metadata.${opts.key}`;

  const rows = (await greptimeDb.unsafe(`
    SELECT DISTINCT span_attributes['${attrKey.replace(/'/g, "''")}'] as attr_value
    FROM opentelemetry_traces
    WHERE resource_attributes['service.name'] = 'hebo-gateway'
      AND span_attributes['hebo.agent.slug'] = '${opts.agentSlug}'
      AND span_attributes['hebo.branch.slug'] = '${opts.branchSlug}'
      AND span_name LIKE 'gen_ai%'
      AND start_time >= '${from.toISOString()}'
      AND start_time <= '${to.toISOString()}'
      AND span_attributes['${attrKey.replace(/'/g, "''")}'] IS NOT NULL
    LIMIT 50
  `)) as { attr_value: string }[];

  return rows.map((r) => r.attr_value).filter(Boolean);
}
