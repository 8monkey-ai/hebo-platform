import { Elysia, status, t } from "elysia";

import { getMetadataTags, getTrace, listTraces } from "./service";
import { MetadataTagsResponse, TraceDetail, TraceListResponse } from "./types";

export const tracesModule = new Elysia({
  prefix: "/:branchSlug/traces",
})
  .get(
    "/",
    async ({ params, query }) => {
      const now = new Date();
      const from = query.from ? new Date(query.from) : new Date(now.getTime() - 60 * 60 * 1000);
      const to = query.to ? new Date(query.to) : now;
      const page = Number(query.page ?? 1);
      const pageSize = Math.min(Number(query.pageSize ?? 50), 200);

      // Extract metadata filters from query params (meta.key=value)
      const metadataFilters: Record<string, string> = {};
      for (const [key, value] of Object.entries(query)) {
        if (key.startsWith("meta.") && typeof value === "string") {
          metadataFilters[key.slice(5)] = value;
        }
      }

      return status(
        200,
        await listTraces({
          agentSlug: params.agentSlug,
          branchSlug: params.branchSlug,
          from,
          to,
          page,
          pageSize,
          metadataFilters,
        }),
      );
    },
    {
      query: t.Object({
        from: t.Optional(t.String()),
        to: t.Optional(t.String()),
        page: t.Optional(t.String()),
        pageSize: t.Optional(t.String()),
      }),
      response: { 200: TraceListResponse },
      detail: { description: "List gen_ai traces for a branch" },
    },
  )
  .get(
    "/metadata-tags",
    async ({ params, query }) => {
      const now = new Date();
      const from = query.from ? new Date(query.from) : new Date(now.getTime() - 60 * 60 * 1000);
      const to = query.to ? new Date(query.to) : now;

      return status(
        200,
        await getMetadataTags(params.agentSlug, params.branchSlug, from, to),
      );
    },
    {
      query: t.Object({
        from: t.Optional(t.String()),
        to: t.Optional(t.String()),
      }),
      response: { 200: MetadataTagsResponse },
      detail: { description: "Get available metadata tag keys and values" },
    },
  )
  .get(
    "/:traceId",
    async ({ params }) => {
      const trace = await getTrace(params.agentSlug, params.branchSlug, params.traceId);
      if (!trace) {
        return status(404, "Trace not found");
      }
      return status(200, trace);
    },
    {
      response: { 200: TraceDetail, 404: t.String() },
      detail: { description: "Get full trace detail" },
    },
  );
