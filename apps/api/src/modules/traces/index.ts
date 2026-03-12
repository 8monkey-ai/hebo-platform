import { Elysia, status, t } from "elysia";

import { getMetadataTags, getTrace, listTraces } from "./service";
import { MetadataTagsResponse, TraceDetail, TraceListResponse } from "./types";

export const tracesModule = new Elysia({
  prefix: "/:agentSlug/branches/:branchSlug/traces",
})
  .get(
    "/",
    async ({ params, query }) => {
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
          from: new Date(query.from!),
          to: new Date(query.to!),
          page: query.page!,
          pageSize: query.pageSize!,
          metadataFilters,
        }),
      );
    },
    {
      query: t.Object(
        {
          from: t.Optional(
            t.String({
              default: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
              format: "date-time",
            }),
          ),
          to: t.Optional(
            t.String({
              default: new Date().toISOString(),
              format: "date-time",
            }),
          ),
          page: t.Optional(t.Number({ default: 1 })),
          pageSize: t.Optional(t.Number({ default: 50 })),
        },
        {
          additionalProperties: false,
          patternProperties: {
            "^meta\\..+": t.String(),
          },
        },
      ),
      response: { 200: TraceListResponse },
    },
  )
  .get(
    "/metadata",
    async ({ params, query }) => {
      return status(
        200,
        await getMetadataTags(
          params.agentSlug,
          params.branchSlug,
          new Date(query.from!),
          new Date(query.to!),
        ),
      );
    },
    {
      query: t.Object({
        from: t.Optional(
          t.String({
            default: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            format: "date-time",
          }),
        ),
        to: t.Optional(
          t.String({
            default: new Date().toISOString(),
            format: "date-time",
          }),
        ),
      }),
      response: { 200: MetadataTagsResponse },
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
    },
  );
