import { t } from "elysia";

export const TimeRangePreset = t.Union([
  t.Literal("15m"),
  t.Literal("1h"),
  t.Literal("24h"),
]);

export const TraceListQuery = t.Object({
  from: t.Optional(t.String({ format: "date-time" })),
  to: t.Optional(t.String({ format: "date-time" })),
  timeRange: t.Optional(TimeRangePreset),
  page: t.Optional(t.String({ default: "1" })),
  pageSize: t.Optional(t.String({ default: "50" })),
  // Metadata filters are passed as meta.key=value
});

export const TraceSummary = t.Object({
  traceId: t.String(),
  spanId: t.String(),
  operationName: t.String(),
  model: t.String(),
  statusCode: t.Number(),
  startTime: t.String(),
  endTime: t.String(),
  durationMs: t.Number(),
});

export const TraceDetail = t.Object({
  traceId: t.String(),
  spanId: t.String(),
  operationName: t.String(),
  model: t.String(),
  provider: t.String(),
  statusCode: t.Number(),
  startTime: t.String(),
  endTime: t.String(),
  durationMs: t.Number(),
  inputTokens: t.Optional(t.Number()),
  outputTokens: t.Optional(t.Number()),
  totalTokens: t.Optional(t.Number()),
  finishReason: t.Optional(t.String()),
  inputMessages: t.Optional(t.Any()),
  outputContent: t.Optional(t.Any()),
  toolCalls: t.Optional(t.Any()),
  toolDefinitions: t.Optional(t.Any()),
  requestMetadata: t.Record(t.String(), t.String()),
  rawAttributes: t.Record(t.String(), t.Any()),
});

export const TraceListResponse = t.Object({
  data: t.Array(TraceSummary),
  total: t.Number(),
  page: t.Number(),
  pageSize: t.Number(),
});

export const MetadataKeysResponse = t.Array(t.String());

export const MetadataValuesQuery = t.Object({
  key: t.String(),
  from: t.Optional(t.String({ format: "date-time" })),
  to: t.Optional(t.String({ format: "date-time" })),
  timeRange: t.Optional(TimeRangePreset),
});

export const MetadataValuesResponse = t.Array(t.String());
