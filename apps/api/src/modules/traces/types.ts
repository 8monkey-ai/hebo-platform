import { t } from "elysia";

const DefaultFromDate = () => new Date(Date.now() - 60 * 60 * 1000);
const DefaultToDate = () => new Date();

const TraceDateQuery = (defaultValue: () => Date) =>
  t.Date({
    default: defaultValue(),
  });

const TraceFromQuery = TraceDateQuery(DefaultFromDate);
const TraceToQuery = TraceDateQuery(DefaultToDate);

export const TraceListQuery = t.Object(
  {
    from: TraceFromQuery,
    to: TraceToQuery,
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

export const TraceMetadataQuery = t.Object({
  from: TraceFromQuery,
  to: TraceToQuery,
});

const TraceStatus = t.Union([t.Literal("ok"), t.Literal("error"), t.Literal("unknown")]);

export const TraceListItem = t.Object({
  timestamp: t.String(),
  spanId: t.String(),
  operationName: t.String(),
  model: t.String(),
  provider: t.String(),
  status: TraceStatus,
  durationMs: t.Number(),
  summary: t.String(),
});

export const TraceListResponse = t.Object({
  data: t.Array(TraceListItem),
  hasNextPage: t.Boolean(),
});

const TraceAttributes = t.Record(
  t.String(),
  t.Union([t.String(), t.Number(), t.Boolean(), t.Null()]),
);

const TraceMessage = t.Object({
  role: t.String(),
  name: t.Optional(t.String()),
  content: t.Optional(t.Any()),
  parts: t.Optional(t.Array(t.Any())),
  tool_calls: t.Optional(t.Array(t.Any())),
});

export const TraceDetail = t.Object({
  timestamp: t.String(),
  spanId: t.String(),
  operationName: t.String(),
  model: t.String(),
  responseModel: t.String(),
  provider: t.String(),
  status: TraceStatus,
  durationMs: t.Number(),
  inputTokens: t.Nullable(t.Number()),
  outputTokens: t.Nullable(t.Number()),
  totalTokens: t.Nullable(t.Number()),
  reasoningTokens: t.Nullable(t.Number()),
  inputMessages: t.Array(TraceMessage),
  outputMessages: t.Array(TraceMessage),
  finishReasons: t.Nullable(t.Array(t.String())),
  responseId: t.String(),
  metadata: t.Record(t.String(), t.String()),
  spanAttributes: TraceAttributes,
});

const StringArrayRecord = t.Record(t.String(), t.Array(t.String()));

export const MetadataTagsResponse = t.Object({
  tags: StringArrayRecord,
});
