import { Elysia, status, t } from "elysia";

import { getMetadataKeys, getMetadataValues, getTrace, listTraces } from "./service";

const TimeRangePresets: Record<string, number> = {
  "15m": 15 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
};

const TraceRow = t.Object({
  timestamp: t.String(),
  duration_nano: t.Number(),
  trace_id: t.String(),
  span_id: t.String(),
  span_name: t.String(),
  span_status_code: t.String(),
  operation_name: t.Nullable(t.String()),
  request_model: t.Nullable(t.String()),
  response_model: t.Nullable(t.String()),
  provider_name: t.Nullable(t.String()),
  input_messages: t.Any(),
  output_messages: t.Any(),
  response_id: t.Nullable(t.String()),
  finish_reasons: t.Any(),
  total_tokens: t.Nullable(t.Number()),
  input_tokens: t.Nullable(t.Number()),
  output_tokens: t.Nullable(t.Number()),
  reasoning_output_tokens: t.Nullable(t.Number()),
});

function parseTimeRange(query: {
  preset?: string;
  from?: string;
  to?: string;
}): { from: Date; to: Date } {
  const now = new Date();

  if (query.from && query.to) {
    return { from: new Date(query.from), to: new Date(query.to) };
  }

  const presetMs = TimeRangePresets[query.preset ?? "1h"] ?? TimeRangePresets["1h"]!;
  return { from: new Date(now.getTime() - presetMs), to: now };
}

function extractMetadataFilters(
  query: Record<string, string | undefined>,
): Record<string, string> | undefined {
  const metadata: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (key.startsWith("meta.") && value) {
      metadata[key.slice(5)] = value;
    }
  }
  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

export const tracesModule = new Elysia({
  prefix: "/:branchSlug/traces",
})
  .get(
    "/",
    async ({ params, query }) => {
      const { from, to } = parseTimeRange(query);
      const metadata = extractMetadataFilters(query as Record<string, string | undefined>);

      const result = await listTraces({
        agentSlug: params.agentSlug,
        branchSlug: params.branchSlug,
        from,
        to,
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 50,
        metadata,
      });

      return status(200, result);
    },
    {
      query: t.Object({
        preset: t.Optional(t.String()),
        from: t.Optional(t.String()),
        to: t.Optional(t.String()),
        page: t.Optional(t.Number({ default: 1 })),
        pageSize: t.Optional(t.Number({ default: 50 })),
      }),
      response: {
        200: t.Object({
          data: t.Array(TraceRow),
          total: t.Number(),
          page: t.Number(),
          pageSize: t.Number(),
        }),
      },
    },
  )
  .get(
    "/:traceId",
    async ({ params }) => {
      const trace = await getTrace({
        agentSlug: params.agentSlug,
        branchSlug: params.branchSlug,
        traceId: params.traceId,
      });

      if (!trace) {
        return status(404, "Trace not found");
      }

      return status(200, trace);
    },
    {
      response: { 200: TraceRow, 404: t.String() },
    },
  )
  .get(
    "/metadata-keys",
    async ({ params, query }) => {
      const { from, to } = parseTimeRange(query);
      const keys = await getMetadataKeys({
        agentSlug: params.agentSlug,
        branchSlug: params.branchSlug,
        from,
        to,
      });
      return status(200, keys);
    },
    {
      query: t.Object({
        preset: t.Optional(t.String()),
        from: t.Optional(t.String()),
        to: t.Optional(t.String()),
      }),
      response: { 200: t.Array(t.String()) },
    },
  )
  .get(
    "/metadata-values",
    async ({ params, query }) => {
      const { from, to } = parseTimeRange(query);
      const values = await getMetadataValues({
        agentSlug: params.agentSlug,
        branchSlug: params.branchSlug,
        key: query.key,
        from,
        to,
      });
      return status(200, values);
    },
    {
      query: t.Object({
        key: t.String(),
        preset: t.Optional(t.String()),
        from: t.Optional(t.String()),
        to: t.Optional(t.String()),
      }),
      response: { 200: t.Array(t.String()) },
    },
  );
