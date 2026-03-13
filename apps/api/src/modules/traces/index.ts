import { Elysia, status, t } from "elysia";

import { greptimeDb as greptimeDbMiddleware } from "~api/middleware/greptime";

import { getMetadataTags, getSpan, listSpans } from "./service";
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
        await listSpans(
          greptimeDb,
          organizationId,
          params.agentSlug,
          params.branchSlug,
          query.from,
          query.to,
          query.page,
          query.pageSize,
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
          organizationId,
          params.agentSlug,
          params.branchSlug,
          query.from,
          query.to,
        ),
      );
    },
    {
      query: TraceMetadataQuery,
      response: { 200: MetadataTagsResponse },
    },
  )
  .get(
    "/:spanId",
    async ({ greptimeDb, organizationId, params }) => {
      const trace = await getSpan(
        greptimeDb,
        organizationId,
        params.agentSlug,
        params.branchSlug,
        params.spanId,
      );
      if (!trace) {
        return status(404, "Span not found");
      }
      return status(200, trace);
    },
    {
      response: { 200: TraceDetail, 404: t.String() },
    },
  );
