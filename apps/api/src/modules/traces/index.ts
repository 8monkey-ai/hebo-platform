import { Elysia, status, t } from "elysia";

import { authService } from "@hebo/shared-api/middlewares/auth";

import { getMetadataKeys, getMetadataValues, getTrace, listTraces } from "./service";
import { TraceDetail, TraceListResponse } from "./types";

export const tracesModule = new Elysia({
  prefix: "/:agentSlug/branches/:branchSlug/traces",
})
  .use(authService)
  .get(
    "/",
    async ({ params, query }) => {
      const now = new Date();
      let from: Date;
      let to: Date;

      if (query.from && query.to) {
        from = new Date(query.from);
        to = new Date(query.to);
      } else {
        const presetMs: Record<string, number> = {
          "15m": 15 * 60 * 1000,
          "1h": 60 * 60 * 1000,
          "24h": 24 * 60 * 60 * 1000,
        };
        const ms = presetMs[query.timeRange ?? "1h"] ?? presetMs["1h"];
        from = new Date(now.getTime() - ms);
        to = now;
      }

      const metadata: Record<string, string> = {};
      if (query.metadata) {
        for (const entry of query.metadata.split(",")) {
          const [key, ...rest] = entry.split(":");
          if (key && rest.length > 0) {
            metadata[key] = rest.join(":");
          }
        }
      }

      return status(
        200,
        await listTraces({
          agentSlug: params.agentSlug,
          branchSlug: params.branchSlug,
          from,
          to,
          page: Number(query.page ?? 1),
          pageSize: Math.min(Number(query.pageSize ?? 50), 200),
          metadata,
        }),
      );
    },
    {
      query: t.Object({
        timeRange: t.Optional(t.String()),
        from: t.Optional(t.String()),
        to: t.Optional(t.String()),
        page: t.Optional(t.String()),
        pageSize: t.Optional(t.String()),
        metadata: t.Optional(t.String()),
      }),
      response: { 200: TraceListResponse },
    },
  )
  .get(
    "/metadata-keys",
    async ({ params, query }) => {
      const now = new Date();
      let from: Date;
      let to: Date;

      if (query.from && query.to) {
        from = new Date(query.from);
        to = new Date(query.to);
      } else {
        const presetMs: Record<string, number> = {
          "15m": 15 * 60 * 1000,
          "1h": 60 * 60 * 1000,
          "24h": 24 * 60 * 60 * 1000,
        };
        const ms = presetMs[query.timeRange ?? "1h"] ?? presetMs["1h"];
        from = new Date(now.getTime() - ms);
        to = now;
      }

      return status(
        200,
        await getMetadataKeys({
          agentSlug: params.agentSlug,
          branchSlug: params.branchSlug,
          from,
          to,
        }),
      );
    },
    {
      query: t.Object({
        timeRange: t.Optional(t.String()),
        from: t.Optional(t.String()),
        to: t.Optional(t.String()),
      }),
      response: { 200: t.Array(t.String()) },
    },
  )
  .get(
    "/metadata-values",
    async ({ params, query }) => {
      const now = new Date();
      let from: Date;
      let to: Date;

      if (query.from && query.to) {
        from = new Date(query.from);
        to = new Date(query.to);
      } else {
        const presetMs: Record<string, number> = {
          "15m": 15 * 60 * 1000,
          "1h": 60 * 60 * 1000,
          "24h": 24 * 60 * 60 * 1000,
        };
        const ms = presetMs[query.timeRange ?? "1h"] ?? presetMs["1h"];
        from = new Date(now.getTime() - ms);
        to = now;
      }

      return status(
        200,
        await getMetadataValues({
          agentSlug: params.agentSlug,
          branchSlug: params.branchSlug,
          from,
          to,
          key: query.key,
        }),
      );
    },
    {
      query: t.Object({
        key: t.String(),
        timeRange: t.Optional(t.String()),
        from: t.Optional(t.String()),
        to: t.Optional(t.String()),
      }),
      response: { 200: t.Array(t.String()) },
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
      response: { 200: TraceDetail, 404: t.String() },
    },
  );
