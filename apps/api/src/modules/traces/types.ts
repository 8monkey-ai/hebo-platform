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

const NullableAnyArray = t.Nullable(t.Array(t.Any()));
const StringArrayRecord = t.Record(t.String(), t.Array(t.String()));
const AnyRecord = t.Record(t.String(), t.Any());

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
  hasNextPage: t.Boolean(),
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
  inputMessages: NullableAnyArray,
  outputMessages: NullableAnyArray,
  finishReasons: NullableAnyArray,
  responseId: t.String(),
  metadata: t.Record(t.String(), t.String()),
  spanAttributes: AnyRecord,
  resourceAttributes: AnyRecord,
});

export const MetadataTagsResponse = t.Object({
  tags: StringArrayRecord,
});
