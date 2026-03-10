import { t } from "elysia";

export const TraceListItem = t.Object({
  traceId: t.String(),
  spanId: t.String(),
  operationName: t.String(),
  model: t.String(),
  status: t.String(),
  startTime: t.String(),
  endTime: t.String(),
  durationMs: t.Number(),
  spanAttributes: t.Record(t.String(), t.Unknown()),
  resourceAttributes: t.Record(t.String(), t.Unknown()),
});

export const TraceListResponse = t.Object({
  data: t.Array(TraceListItem),
  total: t.Number(),
  page: t.Number(),
  pageSize: t.Number(),
});

export const TraceDetail = t.Object({
  traceId: t.String(),
  spanId: t.String(),
  operationName: t.String(),
  model: t.String(),
  provider: t.String(),
  status: t.String(),
  startTime: t.String(),
  endTime: t.String(),
  durationMs: t.Number(),
  inputTokens: t.Nullable(t.Number()),
  outputTokens: t.Nullable(t.Number()),
  totalTokens: t.Nullable(t.Number()),
  finishReason: t.Nullable(t.String()),
  inputMessages: t.Unknown(),
  outputContent: t.Unknown(),
  toolCalls: t.Unknown(),
  toolDefinitions: t.Unknown(),
  requestMetadata: t.Record(t.String(), t.Unknown()),
  spanAttributes: t.Record(t.String(), t.Unknown()),
  resourceAttributes: t.Record(t.String(), t.Unknown()),
});
