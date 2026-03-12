import { t } from "elysia";

export const TraceListItem = t.Object({
  timestamp: t.String(),
  traceId: t.String(),
  spanId: t.String(),
  operationName: t.String(),
  model: t.String(),
  provider: t.String(),
  status: t.String(),
  durationMs: t.Number(),
  summary: t.String(),
});

export const TraceListResponse = t.Object({
  data: t.Array(TraceListItem),
  total: t.Number(),
  page: t.Number(),
  pageSize: t.Number(),
});

export const TraceDetail = t.Object({
  timestamp: t.String(),
  timestampEnd: t.String(),
  traceId: t.String(),
  spanId: t.String(),
  spanName: t.String(),
  operationName: t.String(),
  model: t.String(),
  responseModel: t.String(),
  provider: t.String(),
  status: t.String(),
  statusMessage: t.String(),
  durationMs: t.Number(),
  inputTokens: t.Nullable(t.Number()),
  outputTokens: t.Nullable(t.Number()),
  totalTokens: t.Nullable(t.Number()),
  reasoningTokens: t.Nullable(t.Number()),
  inputMessages: t.Nullable(t.Array(t.Any())),
  outputMessages: t.Nullable(t.Array(t.Any())),
  finishReasons: t.Nullable(t.Array(t.Any())),
  responseId: t.String(),
  metadata: t.Record(t.String(), t.String()),
  spanAttributes: t.Record(t.String(), t.Any()),
  resourceAttributes: t.Record(t.String(), t.Any()),
});

export const MetadataTagsResponse = t.Object({
  tags: t.Record(t.String(), t.Array(t.String())),
});
