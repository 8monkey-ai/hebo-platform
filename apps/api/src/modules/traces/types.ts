import { t, type Static } from "elysia";

export const TraceListItem = t.Object({
  traceId: t.String(),
  spanId: t.String(),
  operationName: t.String(),
  model: t.String(),
  status: t.String(),
  startTime: t.String(),
  duration: t.Number(),
});

export const TraceDetail = t.Object({
  traceId: t.String(),
  spanId: t.String(),
  operationName: t.String(),
  startTime: t.String(),
  endTime: t.String(),
  duration: t.Number(),
  status: t.String(),
  model: t.String(),
  provider: t.String(),
  inputTokens: t.Optional(t.Number()),
  outputTokens: t.Optional(t.Number()),
  totalTokens: t.Optional(t.Number()),
  finishReason: t.Optional(t.String()),
  inputMessages: t.Optional(t.Any()),
  outputContent: t.Optional(t.Any()),
  toolDefinitions: t.Optional(t.Any()),
  toolCalls: t.Optional(t.Any()),
  requestMetadata: t.Optional(t.Record(t.String(), t.String())),
  agentSlug: t.String(),
  branchSlug: t.String(),
  rawSpanAttributes: t.Record(t.String(), t.Any()),
  rawResourceAttributes: t.Record(t.String(), t.Any()),
});

export const TraceListResponse = t.Object({
  data: t.Array(TraceListItem),
  total: t.Number(),
  page: t.Number(),
  pageSize: t.Number(),
});

export type TraceListItem = Static<typeof TraceListItem>;
export type TraceDetail = Static<typeof TraceDetail>;
export type TraceListResponse = Static<typeof TraceListResponse>;
