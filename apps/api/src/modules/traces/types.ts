import { t } from "elysia";

const DefaultFromDate = () => new Date(Date.now() - 60 * 60 * 1000).toISOString();
const DefaultToDate = () => new Date().toISOString();

const TraceFromQuery = t.Optional(
  t.String({
    default: DefaultFromDate(),
    format: "date-time",
  }),
);

const TraceToQuery = t.Optional(
  t.String({
    default: DefaultToDate(),
    format: "date-time",
  }),
);

const StringArrayRecord = t.Record(t.String(), t.Array(t.String()));

const TraceStatus = t.Union([t.Literal("ok"), t.Literal("error"), t.Literal("unknown")]);

const TraceAttributeValue = t.Union([t.String(), t.Number(), t.Boolean(), t.Null()]);
const TraceAttributes = t.Record(t.String(), TraceAttributeValue);

const TraceMessage = t.Object({
  role: t.String(),
  name: t.Optional(t.String()),
  content: t.Optional(t.Any()),
  parts: t.Optional(t.Array(t.Any())),
  tool_calls: t.Optional(t.Array(t.Any())),
});

export const TraceListQuery = t.Object(
  {
    from: TraceFromQuery,
    to: TraceToQuery,
    page: t.Optional(t.Number({ default: 1 })),
    pageSize: t.Optional(t.Number({ default: 50 })),
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

export const TraceListItem = t.Object({
  timestamp: t.String(),
  traceId: t.String(),
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

export const TraceDetail = t.Object({
  timestamp: t.String(),
  traceId: t.String(),
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

export const MetadataTagsResponse = t.Object({
  tags: StringArrayRecord,
});
