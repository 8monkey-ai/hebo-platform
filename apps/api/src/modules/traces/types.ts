import { t, type Static } from "elysia";

const TraceTimeRangeQuery = {
  from: t.Optional(t.Date()),
  to: t.Optional(t.Date()),
};

export const SpanListQuery = t.Object(
  {
    metadata: t.Optional(t.String()),
    ...TraceTimeRangeQuery,
    page: t.Number({ default: 1 }),
    pageSize: t.Number({ default: 50 }),
  },
  { additionalProperties: false },
);

export const SpanMetadataQuery = t.Object(TraceTimeRangeQuery);

const SpanStatus = t.Union([t.Literal("ok"), t.Literal("error"), t.Literal("unknown")]);

export const SpanListItem = t.Object({
  timestamp: t.String(),
  spanId: t.String(),
  operationName: t.String(),
  model: t.String(),
  provider: t.String(),
  status: SpanStatus,
  durationMs: t.Number(),
  summary: t.String(),
});

export const SpanListResponse = t.Object({
  data: t.Array(SpanListItem),
  hasNextPage: t.Boolean(),
});

const SpanAttributes = t.Record(
  t.String(),
  t.Union([t.String(), t.Number(), t.Boolean(), t.Null()]),
);

const GenericPart = t.Object(
  {
    type: t.String(),
  },
  { additionalProperties: true },
);

const TextPart = t.Object({
  type: t.Literal("text"),
  content: t.String(),
});

const ReasoningPart = t.Object({
  type: t.Literal("reasoning"),
  content: t.String(),
});

const ToolCallPart = t.Object({
  type: t.Literal("tool_call"),
  id: t.Optional(t.String()),
  name: t.String(),
  arguments: t.Any(),
});

const ToolCallResponsePart = t.Object({
  type: t.Literal("tool_call_response"),
  id: t.Optional(t.String()),
  response: t.Any(),
});

const SpanMessagePart = t.Union([
  TextPart,
  ReasoningPart,
  ToolCallPart,
  ToolCallResponsePart,
  GenericPart,
]);

const SpanMessage = t.Object({
  role: t.String(),
  name: t.Optional(t.String()),
  content: t.Optional(t.Union([t.String(), t.Array(SpanMessagePart), t.Null()])),
  parts: t.Optional(t.Array(SpanMessagePart)),
});

const SpanMessages = t.Array(SpanMessage);
const SpanFinishReasons = t.Nullable(t.Array(t.String()));

export const SpanDetail = t.Object({
  timestamp: t.String(),
  spanId: t.String(),
  operationName: t.String(),
  model: t.String(),
  responseModel: t.String(),
  provider: t.String(),
  status: SpanStatus,
  durationMs: t.Number(),
  inputTokens: t.Nullable(t.Number()),
  outputTokens: t.Nullable(t.Number()),
  totalTokens: t.Nullable(t.Number()),
  reasoningTokens: t.Nullable(t.Number()),
  inputMessages: SpanMessages,
  outputMessages: SpanMessages,
  finishReasons: SpanFinishReasons,
  responseId: t.String(),
  metadata: t.Record(t.String(), t.String()),
  spanAttributes: SpanAttributes,
});

export type SpanMessages = Static<typeof SpanMessages>;
export type SpanFinishReasons = Static<typeof SpanFinishReasons>;

const StringArrayRecord = t.Record(t.String(), t.Array(t.String()));

export const MetadataTagsResponse = t.Object({
  tags: StringArrayRecord,
});
