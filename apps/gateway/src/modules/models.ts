import { Elysia, t } from "elysia";

import supportedModels from "@hebo/shared-data/json/supported-models";

const model = t.Object({
  id: t.String(),
  name: t.String(),
  object: t.Literal("model"),
  created: t.Number(),
  owned_by: t.String(),
  architecture: t.Object({
    output_modalities: t.Array(t.String()),
  }),
  pricing: t.Object({
    monthly_free_tokens: t.Number(),
  }),
  endpoints: t.Optional(
    t.Array(
      t.Object({
        tag: t.String(),
      }),
    ),
  ),
});

const modelsInclude = t.Optional(t.Object({ endpoints: t.Boolean() }));

function modelToModelsResponse(
  m: (typeof supportedModels)[0],
  withEndpoints = false,
) {
  const responseModel = {
    object: "model" as const,
    id: m.type,
    name: m.displayName,
    created: m.created,
    owned_by: m.owner,
    architecture: {
      output_modalities: [m.modality],
    },
    pricing: {
      monthly_free_tokens: m.monthlyFreeTokens || 0,
    },
    ...(withEndpoints && {
      endpoints: Object.keys(m.providers[0]).map((tag) => ({ tag })),
    }),
  };

  return responseModel;
}

// Modeled after OpenRouter API as a superset of OpenAI API
export const models = new Elysia({
  name: "models",
  prefix: "/models",
})
  .get(
    "/",
    ({ query }) => {
      return {
        object: "list" as const,
        data: supportedModels.map((m) =>
          modelToModelsResponse(m, query.endpoints),
        ),
      };
    },
    {
      query: modelsInclude,
      response: t.Object({
        object: t.Literal("list"),
        data: t.Array(model),
      }),
    },
  )

  .get(
    "/:author/:slug/endpoints",
    ({ params }) => {
      const id = `${params.author}/${params.slug}`;
      const m = supportedModels.find((model) => model.type === id);
      if (!m) return new Response("Model not found", { status: 404 });

      return {
        data: modelToModelsResponse(m, true),
      };
    },
    {
      params: t.Object({
        author: t.String(),
        slug: t.String(),
      }),
      response: {
        200: t.Object({ data: model }),
        404: t.String(),
      },
    },
  );
