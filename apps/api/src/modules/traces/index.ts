import { Elysia, status } from "elysia";
import { z } from "zod";

import { greptime } from "~api/middlewares/greptime";

import { getSpans, listTraces } from "./service";
import { SpanListSchema, TraceListQuerySchema, TraceListResponseSchema } from "./types";

const DEFAULT_FROM = () => new Date(Date.now() - 60 * 60 * 1000);
const DEFAULT_TO = () => new Date();

export const tracesModule = new Elysia({
  prefix: "/traces",
})
  .use(greptime)
  .get(
    "/",
    async ({ greptimeDb, organizationId, workspaceSlug, query }) => {
      return status(
        200,
        await listTraces(
          greptimeDb,
          organizationId!,
          workspaceSlug,
          query.from ?? DEFAULT_FROM(),
          query.to ?? DEFAULT_TO(),
          // FUTURE: remove '!' on page & pageSize
          // https://github.com/elysiajs/elysia/issues/817
          query.page!,
          query.pageSize!,
          query.metadata ?? {},
          query.status,
          query.operation,
        ),
      );
    },
    {
      query: TraceListQuerySchema,
      response: { 200: TraceListResponseSchema },
    },
  )
  .get(
    "/:traceId",
    async ({ greptimeDb, organizationId, workspaceSlug, params }) => {
      const spans = await getSpans(greptimeDb, organizationId!, workspaceSlug, params.traceId);
      if (spans.length === 0) return status(404, null);
      return status(200, spans);
    },
    {
      response: { 200: SpanListSchema, 404: z.null() },
    },
  );
