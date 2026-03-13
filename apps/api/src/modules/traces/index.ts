import { Elysia, status, t } from "elysia";

import { BadRequestError } from "@hebo/shared-api/errors";

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
      let metadata: Record<string, string> = {};
      if (query.metadata) {
        try {
          const parsed = JSON.parse(query.metadata);
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw 0;
          metadata = parsed;
        } catch {
          throw new BadRequestError(`Invalid metadata filter: ${query.metadata}`);
        }
      }

      return status(
        200,
        await listSpans(
          greptimeDb,
          organizationId,
          params.agentSlug,
          params.branchSlug,
          query.from ?? DEFAULT_FROM(),
          query.to ?? DEFAULT_TO(),
          query.page,
          query.pageSize,
          metadata,
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
