import { Elysia, status, t } from "elysia";

import {
  MetadataKeysResponse,
  MetadataValuesQuery,
  MetadataValuesResponse,
  TraceDetail,
  TraceListQuery,
  TraceListResponse,
} from "./types";
import { getMetadataKeys, getMetadataValues, getTrace, listTraces } from "./service";

export const tracesModule = new Elysia({
  prefix: "/:agentSlug/branches/:branchSlug/traces",
})
  .get(
    "/",
    async ({ params, query, request }) => {
      const url = new URL(request.url);
      const metadataFilters: Record<string, string> = {};
      for (const [key, value] of url.searchParams.entries()) {
        if (key.startsWith("meta.")) {
          metadataFilters[key.slice(5)] = value;
        }
      }

      const result = await listTraces({
        agentSlug: params.agentSlug,
        branchSlug: params.branchSlug,
        from: query.from,
        to: query.to,
        timeRange: query.timeRange,
        page: Number(query.page ?? "1"),
        pageSize: Math.min(Number(query.pageSize ?? "50"), 200),
        metadataFilters,
      });

      return status(200, result);
    },
    {
      query: TraceListQuery,
      response: { 200: TraceListResponse },
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
      response: { 200: MetadataKeysResponse },
    },
  )
  .get(
    "/metadata-values",
    async ({ params, query }) => {
      const values = await getMetadataValues({
        agentSlug: params.agentSlug,
        branchSlug: params.branchSlug,
        key: query.key,
        from: query.from,
        to: query.to,
        timeRange: query.timeRange,
      });

      return status(200, values);
    },
    {
      query: MetadataValuesQuery,
      response: { 200: MetadataValuesResponse },
    },
  );
