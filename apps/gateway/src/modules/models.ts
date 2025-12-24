import { Elysia, t } from "elysia";

import { getSupportedModels } from "../middlewares/models";
import { type SupportedModel } from "../middlewares/models/model";
import { ProviderAdapterFactory } from "../middlewares/providers";

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

function modelToModelsResponse(m: SupportedModel, withEndpoints = false) {
  const responseModel = {
    object: "model" as const,
    id: m.id,
    name: m.name,
    created: m.created,
    owned_by: m.owned_by,
    architecture: {
      output_modalities: [m.modality],
    },
    pricing: {
      monthly_free_tokens: m.pricing.monthly_free_tokens,
    },
    ...(withEndpoints && {
      endpoints: ProviderAdapterFactory.ALL_PROVIDER_ADAPTER_CLASSES.filter(
        (ProviderAdapterClass) => ProviderAdapterClass.supportsModel(m.id),
      ).map((ProviderAdapterClass) => {
        return { tag: ProviderAdapterClass.providerSlug };
      }),
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
        data: getSupportedModels().map((m) =>
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
      const m = getSupportedModels().find((model) => model.id === id);
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
