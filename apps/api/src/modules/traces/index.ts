import { Elysia, status, t } from "elysia";

import { greptimeDb as greptimeDbMiddleware } from "~api/middleware/greptime";

import { getMetadataTags, getSpan, listSpans } from "./service";
import {
  MetadataTagsResponse,
  SpanDetail,
  SpanListQuery,
  SpanListResponse,
  SpanMetadataQuery,
} from "./types";

const DEFAULT_FROM = () => new Date(Date.now() - 60 * 60 * 1000);
const DEFAULT_TO = () => new Date();

export const spansModule = new Elysia({
  prefix: "/:agentSlug/branches/:branchSlug/traces",
})
  .use(greptimeDbMiddleware)
  .get(
    "/",
    async ({ greptimeDb, organizationId, params, query }) => {
      const from = query.from ?? DEFAULT_FROM();
      const to = query.to ?? DEFAULT_TO();

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
          from,
          to,
          query.page,
          query.pageSize,
          metadataFilters,
        ),
      );
    },
    {
      query: SpanListQuery,
      response: { 200: SpanListResponse },
    },
  )
  .get(
    "/metadata",
    async ({ greptimeDb, organizationId, params, query }) => {
      const from = query.from ?? DEFAULT_FROM();
      const to = query.to ?? DEFAULT_TO();

      return status(
        200,
        await getMetadataTags(
          greptimeDb,
          organizationId,
          params.agentSlug,
          params.branchSlug,
          from,
          to,
        ),
      );
    },
    {
      query: SpanMetadataQuery,
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
      response: { 200: SpanDetail, 404: t.String() },
    },
  );
