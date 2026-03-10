import { Elysia, status, t } from "elysia";

import { authService } from "@hebo/shared-api/middlewares/auth";

import { getMetadataKeys, getMetadataValues, getTraceDetail, listTraces } from "./service";
import { TraceDetail, TraceListResponse } from "./types";

function parseTimeRange(from: string | undefined, to: string | undefined, preset: string | undefined) {
  const now = new Date();
  let fromDate: Date;
  let toDate: Date = to ? new Date(to) : now;

  if (from) {
    fromDate = new Date(from);
  } else {
    const presetMs: Record<string, number> = {
      "15m": 15 * 60 * 1000,
      "1h": 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
    };
    fromDate = new Date(now.getTime() - (presetMs[preset ?? "1h"] ?? presetMs["1h"]));
  }

  return { from: fromDate, to: toDate };
}

function extractMetadataFilters(query: Record<string, string | undefined>): Record<string, string> {
  const filters: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (key.startsWith("meta.") && value) {
      filters[key.slice(5)] = value;
    }
  }
  return filters;
}

export const tracesModule = new Elysia({
  prefix: "/:agentSlug/branches/:branchSlug/traces",
})
  .use(authService)
  .get(
    "/",
    async ({ params, query }) => {
      const { from, to } = parseTimeRange(query.from, query.to, query.preset);
      const page = Math.max(1, Number(query.page ?? 1));
      const pageSize = Math.min(200, Math.max(1, Number(query.pageSize ?? 50)));
      const metadataFilters = extractMetadataFilters(query as Record<string, string | undefined>);

      const result = await listTraces({
        agentSlug: params.agentSlug,
        branchSlug: params.branchSlug,
        from,
        to,
        limit: pageSize,
        offset: (page - 1) * pageSize,
        metadataFilters: Object.keys(metadataFilters).length > 0 ? metadataFilters : undefined,
      });

      return status(200, {
        data: result.data,
        total: result.total,
        page,
        pageSize,
      });
    },
    {
      query: t.Object(
        {
          from: t.Optional(t.String()),
          to: t.Optional(t.String()),
          preset: t.Optional(t.String()),
          page: t.Optional(t.String()),
          pageSize: t.Optional(t.String()),
        },
        { additionalProperties: true },
      ),
      response: { 200: TraceListResponse },
    },
  )
  .get(
    "/:traceId",
    async ({ params }) => {
      const trace = await getTraceDetail({
        agentSlug: params.agentSlug,
        branchSlug: params.branchSlug,
        traceId: params.traceId,
      });

      if (!trace) return status(404, "Trace not found");
      return status(200, trace);
    },
    {
      response: { 200: TraceDetail, 404: t.String() },
    },
  )
  .get(
    "/metadata-keys",
    async ({ params, query }) => {
      const { from, to } = parseTimeRange(query.from, query.to, query.preset);
      return status(
        200,
        await getMetadataKeys({
          agentSlug: params.agentSlug,
          branchSlug: params.branchSlug,
          from,
          to,
        }),
      );
    },
    {
      query: t.Object({
        from: t.Optional(t.String()),
        to: t.Optional(t.String()),
        preset: t.Optional(t.String()),
      }),
      response: { 200: t.Array(t.String()) },
    },
  )
  .get(
    "/metadata-values",
    async ({ params, query }) => {
      const { from, to } = parseTimeRange(query.from, query.to, query.preset);
      return status(
        200,
        await getMetadataValues({
          agentSlug: params.agentSlug,
          branchSlug: params.branchSlug,
          from,
          to,
          key: query.key,
        }),
      );
    },
    {
      query: t.Object({
        key: t.String(),
        from: t.Optional(t.String()),
        to: t.Optional(t.String()),
        preset: t.Optional(t.String()),
      }),
      response: { 200: t.Array(t.String()) },
    },
  );
