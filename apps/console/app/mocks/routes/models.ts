import { http, HttpResponse } from "msw";

const SUPPORTED_MODELS = [
  {
    type: "openai/gpt-oss-120b",
    displayName: "OpenAI GPT OSS 120B",
    owner: "openai",
    created: 1_764_888_221,
    providers: [
      {
        bedrock: "openai.gpt-oss-120b-1:0",
        groq: "openai/gpt-oss-120b",
      },
    ],
    modality: "chat",
    monthlyFreeTokens: 100_000_000,
  },
  {
    type: "voyage/voyage-3.5",
    displayName: "Voyage 3.5",
    owner: "voyage",
    created: 1_767_837_920,
    providers: [
      {
        voyage: "voyage-3.5",
      },
    ],
    modality: "embedding",
    monthlyFreeTokens: 0,
  },
] as const;

export const modelHandlers = [
  http.get("/gateway/v1/models", ({ request }) => {
    const includeEndpoints =
      new URL(request.url).searchParams.get("endpoints") === "true";

    return HttpResponse.json({
      object: "list" as const,
      data: SUPPORTED_MODELS.map((model) => ({
        object: "model" as const,
        id: model.type,
        name: model.displayName,
        created: model.created,
        owned_by: model.owner,
        architecture: {
          output_modalities: [model.modality],
        },
        pricing: {
          monthly_free_tokens: model.monthlyFreeTokens ?? 0,
        },
        ...(includeEndpoints && {
          endpoints: Object.keys(model.providers[0]).map((tag) => ({ tag })),
        }),
      })),
    });
  }),
];
