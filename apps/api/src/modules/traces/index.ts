import { Elysia, status, t } from "elysia";

import { greptimeDb as greptimeDbMiddleware } from "~api/middleware/greptime";

import { getMetadataTags, getTrace, listTraces } from "./service";
import {
  MetadataTagsResponse,
  TraceDetail,
  TraceListQuery,
  TraceListResponse,
  TraceMetadataQuery,
} from "./types";

export const tracesModule = new Elysia({
  prefix: "/:agentSlug/branches/:branchSlug/traces",
})
  .use(greptimeDbMiddleware)
  .get(
    "/",
    async ({ greptimeDb, organizationId, params, query }) => {
      // Extract metadata filters from query params (meta.key=value)
      const metadataFilters: Record<string, string> = {};
      for (const [key, value] of Object.entries(query)) {
        if (key.startsWith("meta.") && typeof value === "string") {
          metadataFilters[key.slice(5)] = value;
        }
      }

      return status(
        200,
        await listTraces(
          greptimeDb,
          organizationId!,
          params.agentSlug,
          params.branchSlug,
          new Date(query.from!),
          new Date(query.to!),
          query.page!,
          query.pageSize!,
          metadataFilters,
        ),
      );
    },
    {
      query: TraceListQuery,
      response: { 200: TraceListResponse },
    },
  )
  .get(
    "/metadata",
    async ({ greptimeDb, organizationId, params, query }) => {
      return status(
        200,
        await getMetadataTags(
          greptimeDb,
          organizationId!,
          params.agentSlug,
          params.branchSlug,
          new Date(query.from!),
          new Date(query.to!),
        ),
      );
    },
    {
      query: TraceMetadataQuery,
      response: { 200: MetadataTagsResponse },
    },
  )
  .get(
    "/:traceId",
    async ({ greptimeDb, organizationId, params }) => {
      const trace = await getTrace(
        greptimeDb,
        organizationId!,
        params.agentSlug,
        params.branchSlug,
        params.traceId,
      );
      if (!trace) {
        return status(404, "Trace not found");
      }
      return status(200, trace);
    },
    {
      response: { 200: TraceDetail, 404: t.String() },
    },
  );
