import { Elysia, status, t } from "elysia";

import { authService } from "@hebo/shared-api/middlewares/auth";

import { getTrace, listMetadataKeys, listTraces } from "./service";
import { TimeRange, TraceDetail, TraceListResponse } from "./types";

export const tracesModule = new Elysia({
  prefix: "/:agentSlug/branches/:branchSlug/traces",
})
  .use(authService)
  .get(
    "/",
    async ({ params, query, request }) => {
      const url = new URL(request.url);
      const metadata: Record<string, string> = {};
      for (const [key, value] of url.searchParams.entries()) {
        if (key.startsWith("meta.")) {
          metadata[key.slice(5)] = value;
        }
      }

      return status(
        200,
        await listTraces({
          agentSlug: params.agentSlug,
          branchSlug: params.branchSlug,
          from: query.from,
          to: query.to,
          timeRange: query.timeRange,
          page: query.page ?? 1,
          pageSize: query.pageSize ?? 50,
          metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        }),
      );
    },
    {
      query: t.Object({
        from: t.Optional(t.String()),
        to: t.Optional(t.String()),
        timeRange: t.Optional(TimeRange),
        page: t.Optional(t.Numeric({ default: 1 })),
        pageSize: t.Optional(t.Numeric({ default: 50 })),
      }),
      response: { 200: TraceListResponse },
    },
  )
  .get(
    "/metadata-keys",
    async ({ params, query }) => {
      return status(
        200,
        await listMetadataKeys({
          agentSlug: params.agentSlug,
          branchSlug: params.branchSlug,
          from: query.from,
          to: query.to,
          timeRange: query.timeRange,
        }),
      );
    },
    {
      query: t.Object({
        from: t.Optional(t.String()),
        to: t.Optional(t.String()),
        timeRange: t.Optional(TimeRange),
      }),
      response: { 200: t.Array(t.String()) },
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
      response: { 200: TraceDetail, 404: t.String() },
    },
  );
