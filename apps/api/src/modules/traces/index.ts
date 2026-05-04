import { Elysia, status } from "elysia";
import { z } from "zod";

import { greptime } from "~api/middlewares/greptime";

import { getSpans, listTraces } from "./service";
import {
  SpanListSchema,
  TraceDetailQuerySchema,
  TraceListQuerySchema,
  TraceListResponseSchema,
} from "./types";

const DEFAULT_FROM = () => new Date(Date.now() - 60 * 60 * 1000);
const DEFAULT_TO = () => new Date();

export const tracesModule = new Elysia({
  prefix: "/traces",
})
  .use(greptime)
  .get(
    "/",
    async ({ greptimeDb, organizationId, query }) => {
      return status(
        200,
        await listTraces(
          greptimeDb,
          organizationId!,
          query.workspace,
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
    async ({ greptimeDb, organizationId, params, query }) => {
      const spans = await getSpans(greptimeDb, organizationId!, query.workspace, params.traceId);
      if (spans.length === 0) return status(404, null);
      return status(200, spans);
    },
    {
      query: TraceDetailQuerySchema,
      response: { 200: SpanListSchema, 404: z.null() },
    },
  );
