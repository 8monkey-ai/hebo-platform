import { t, type Static } from "elysia";

const TraceTimeRangeQuery = {
  from: t.Optional(t.Date()),
  to: t.Optional(t.Date()),
};

export const TraceListQuery = t.Object({
  metadata: t.Optional(t.String()),
  ...TraceTimeRangeQuery,
  page: t.Number({ default: 1 }),
  pageSize: t.Number({ default: 50 }),
});

const SpanStatus = t.Union([t.Literal("ok"), t.Literal("error"), t.Literal("unknown")]);

export const TraceListItem = t.Object({
  timestamp: t.String(),
  traceId: t.String(),
  operationName: t.String(),
  model: t.String(),
  provider: t.String(),
  status: SpanStatus,
  durationMs: t.Number(),
  summary: t.String(),
  metadata: t.Record(t.String(), t.String()),
});

export const TraceListResponse = t.Object({
  data: t.Array(TraceListItem),
  hasNextPage: t.Boolean(),
  metadataKeys: t.Array(t.String()),
});

const SpanAttributes = t.Record(
  t.String(),
  t.Union([t.String(), t.Number(), t.Boolean(), t.Null()]),
);

const GenericPart = t.Object({ type: t.String() }, { additionalProperties: true });

const TextPart = t.Object(
  { type: t.Literal("text"), content: t.String() },
  { additionalProperties: true },
);

const ReasoningPart = t.Object(
  { type: t.Literal("reasoning"), content: t.String() },
  { additionalProperties: true },
);

const ToolCallPart = t.Object(
  {
    type: t.Literal("tool_call"),
    id: t.Optional(t.Nullable(t.String())),
    name: t.String(),
    arguments: t.Any(),
  },
  { additionalProperties: true },
);

const ToolCallResponsePart = t.Object(
  {
    type: t.Literal("tool_call_response"),
    id: t.Optional(t.Nullable(t.String())),
    response: t.Any(),
  },
  { additionalProperties: true },
);

const GenAIMessagePart = t.Union([
  TextPart,
  ReasoningPart,
  ToolCallPart,
  ToolCallResponsePart,
  GenericPart,
]);

const GenAIInputMessage = t.Object(
  {
    role: t.String(),
    name: t.Optional(t.Nullable(t.String())),
    content: t.Optional(t.Union([t.String(), t.Array(GenAIMessagePart), t.Null()])),
    parts: t.Optional(t.Array(GenAIMessagePart)),
  },
  { additionalProperties: true },
);

const GenAIOutputMessage = t.Object(
  {
    role: t.String(),
    name: t.Optional(t.Nullable(t.String())),
    parts: t.Array(GenAIMessagePart),
    finish_reason: t.Optional(t.String()),
  },
  { additionalProperties: true },
);

const GenAIInputMessages = t.Array(GenAIInputMessage);
const GenAIOutputMessages = t.Array(GenAIOutputMessage);
const GenAIFinishReasons = t.Nullable(t.Array(t.String()));

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
  inputMessages: GenAIInputMessages,
  outputMessages: GenAIOutputMessages,
  finishReasons: GenAIFinishReasons,
  responseId: t.String(),
  metadata: t.Record(t.String(), t.String()),
  spanAttributes: SpanAttributes,
});

export type GenAIInputMessages = Static<typeof GenAIInputMessages>;
export type GenAIOutputMessages = Static<typeof GenAIOutputMessages>;
export type GenAIFinishReasons = Static<typeof GenAIFinishReasons>;
