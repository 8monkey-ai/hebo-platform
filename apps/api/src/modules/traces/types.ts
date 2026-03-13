import { t } from "elysia";

const DefaultFromDate = () => new Date(Date.now() - 60 * 60 * 1000);
const DefaultToDate = () => new Date();

const SpanDateQuery = (defaultValue: () => Date) =>
  t.Date({
    default: defaultValue(),
  });

const SpanFromQuery = SpanDateQuery(DefaultFromDate);
const SpanToQuery = SpanDateQuery(DefaultToDate);

export const SpanListQuery = t.Object(
  {
    from: SpanFromQuery,
    to: SpanToQuery,
    page: t.Number({ default: 1 }),
    pageSize: t.Number({ default: 50 }),
  },
  {
    additionalProperties: false,
    patternProperties: {
      "^meta\\..+": t.String(),
    },
  },
);

export const SpanMetadataQuery = t.Object({
  from: SpanFromQuery,
  to: SpanToQuery,
});

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

const SpanMessage = t.Object({
  role: t.String(),
  name: t.Optional(t.String()),
  content: t.Optional(t.Any()),
  parts: t.Optional(t.Array(t.Any())),
  tool_calls: t.Optional(t.Array(t.Any())),
});

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
  inputMessages: t.Array(SpanMessage),
  outputMessages: t.Array(SpanMessage),
  finishReasons: t.Nullable(t.Array(t.String())),
  responseId: t.String(),
  metadata: t.Record(t.String(), t.String()),
  spanAttributes: SpanAttributes,
});

const StringArrayRecord = t.Record(t.String(), t.Array(t.String()));

export const MetadataTagsResponse = t.Object({
  tags: StringArrayRecord,
});
