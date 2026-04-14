import { Elysia, status } from "elysia";
import { z } from "zod";

import { BadRequestError } from "@hebo/shared-api/errors";

import { greptime } from "~api/middlewares/greptime";

import { getSpans, listTraces } from "./service";
import { SpanDetail, TraceListQuery, TraceListResponse } from "./types";

const DEFAULT_FROM = () => new Date(Date.now() - 60 * 60 * 1000);
const DEFAULT_TO = () => new Date();

export const spansModule = new Elysia({
  prefix: "/agents/:agentSlug/branches/:branchSlug/traces",
})
  .use(greptime)
  .get(
    "/",
    async ({ greptimeDb, organizationId, params, query }) => {
      let metadata: Record<string, string> = {};
      if (query.metadata) {
        try {
          const parsed: unknown = JSON.parse(query.metadata);
          if (
            !parsed ||
            typeof parsed !== "object" ||
            Array.isArray(parsed) ||
            Object.values(parsed).some((value) => typeof value !== "string")
          )
            throw new Error("Invalid metadata");
          metadata = parsed as Record<string, string>;
        } catch {
          throw new BadRequestError(`Invalid metadata filter: ${query.metadata}`);
        }
      }

      return status(
        200,
        await listTraces(
          greptimeDb,
          organizationId!,
          params.agentSlug,
          params.branchSlug,
          query.from ?? DEFAULT_FROM(),
          query.to ?? DEFAULT_TO(),
          // FUTURE: remove '!' on page & pageSize
          // https://github.com/elysiajs/elysia/issues/817
          query.page!,
          query.pageSize!,
          metadata,
          query.status,
          query.operation,
        ),
      );
    },
    {
      query: TraceListQuery,
      response: { 200: TraceListResponse },
    },
  )
  .get(
    "/:traceId",
    async ({ greptimeDb, organizationId, params }) => {
      const spans = await getSpans(
        greptimeDb,
        organizationId!,
        params.agentSlug,
        params.branchSlug,
        params.traceId,
      );
      if (spans.length === 0) return status(404, null);
      return status(200, spans);
    },
    {
      response: { 200: z.array(SpanDetail), 404: z.null() },
    },
  );
