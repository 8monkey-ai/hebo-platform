import { Elysia, status, t } from "elysia";

import { getMetadataKeys, getTrace, listTraces } from "./service";

export const tracesModule = new Elysia({
  prefix: "/:agentSlug/branches/:branchSlug/traces",
})
  .get(
    "/",
    async ({ params, query }) => {
      const metadata: Record<string, string> = {};
      for (const [key, value] of Object.entries(query)) {
        if (key.startsWith("meta.") && typeof value === "string") {
          metadata[key.replace("meta.", "")] = value;
        }
      }

      const result = await listTraces({
        agentSlug: params.agentSlug,
        branchSlug: params.branchSlug,
        from: query.from,
        to: query.to,
        timeRange: query.timeRange,
        page: Number(query.page) || 1,
        pageSize: Math.min(Number(query.pageSize) || 50, 200),
        metadata,
      });

      return status(200, result);
    },
    {
      query: t.Object({
        from: t.Optional(t.String()),
        to: t.Optional(t.String()),
        timeRange: t.Optional(t.String()),
        page: t.Optional(t.String()),
        pageSize: t.Optional(t.String()),
      }),
      response: {
        200: t.Object({
          data: t.Array(t.Any()),
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

      if (!trace) return status(404, "Trace not found");
      return status(200, trace);
    },
    {
      response: { 200: t.Any(), 404: t.String() },
    },
  )
  .get(
    "/metadata-keys",
    async ({ params, query }) => {
      const keys = await getMetadataKeys({
        agentSlug: params.agentSlug,
        branchSlug: params.branchSlug,
        from: query.from,
        to: query.to,
        timeRange: query.timeRange,
      });

      return status(200, keys);
    },
    {
      query: t.Object({
        from: t.Optional(t.String()),
        to: t.Optional(t.String()),
        timeRange: t.Optional(t.String()),
      }),
      response: { 200: t.Array(t.String()) },
    },
  );
