import { t, type Static } from "elysia";

export const TimeRange = t.Union([t.Literal("15m"), t.Literal("1h"), t.Literal("24h")]);

export const TraceListQuery = t.Object({
  from: t.Optional(t.String({ format: "date-time" })),
  to: t.Optional(t.String({ format: "date-time" })),
  timeRange: t.Optional(TimeRange),
  page: t.Optional(t.Numeric({ default: 1, minimum: 1 })),
  pageSize: t.Optional(t.Numeric({ default: 50, minimum: 1, maximum: 200 })),
  // Metadata filters are extracted from `meta.*` query params at the handler level
});

export const TraceSummary = t.Object({
  traceId: t.String(),
  spanId: t.String(),
  operationName: t.String(),
  model: t.Optional(t.String()),
  status: t.String(),
  durationMs: t.Number(),
  startTime: t.String(),
});

export const TraceDetail = t.Object({
  traceId: t.String(),
  spanId: t.String(),
  operationName: t.String(),
  startTime: t.String(),
  endTime: t.String(),
  durationMs: t.Number(),
  status: t.String(),

  // Request
  model: t.Optional(t.String()),
  provider: t.Optional(t.String()),

  // Usage
  inputTokens: t.Optional(t.Number()),
  outputTokens: t.Optional(t.Number()),
  totalTokens: t.Optional(t.Number()),

  // Response
  finishReason: t.Optional(t.String()),

  // Input/Output content
  inputMessages: t.Optional(t.Any()),
  outputContent: t.Optional(t.Any()),

  // Tool calls
  tools: t.Optional(t.Any()),
  toolCalls: t.Optional(t.Any()),

  // Request metadata (gen_ai.request.metadata.*)
  requestMetadata: t.Optional(t.Record(t.String(), t.String())),

  // Agent/branch scope
  agentSlug: t.Optional(t.String()),
  branchSlug: t.Optional(t.String()),

  // Raw span attributes for the JSON tab
  rawAttributes: t.Any(),
});

export const TraceListResponse = t.Object({
  data: t.Array(TraceSummary),
  total: t.Number(),
  page: t.Number(),
  pageSize: t.Number(),
});

export type TraceSummary = Static<typeof TraceSummary>;
export type TraceDetail = Static<typeof TraceDetail>;
export type TraceListResponse = Static<typeof TraceListResponse>;
