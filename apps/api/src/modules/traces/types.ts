import { t } from "elysia";

export const TimeRangePreset = t.Union([t.Literal("15m"), t.Literal("1h"), t.Literal("24h")]);

export const TraceListQuery = t.Object({
  from: t.Optional(t.String()),
  to: t.Optional(t.String()),
  timeRange: t.Optional(TimeRangePreset),
  page: t.Optional(t.String()),
  pageSize: t.Optional(t.String()),
});

export const TraceSummary = t.Object({
  traceId: t.String(),
  spanId: t.String(),
  operationName: t.String(),
  model: t.String(),
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
  model: t.String(),
  provider: t.String(),
  inputTokens: t.Nullable(t.Number()),
  outputTokens: t.Nullable(t.Number()),
  totalTokens: t.Nullable(t.Number()),
  finishReason: t.String(),
  input: t.Any(),
  output: t.Any(),
  toolCalls: t.Any(),
  toolDefinitions: t.Any(),
  requestMetadata: t.Record(t.String(), t.String()),
  raw: t.Any(),
});
