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
    free: true,
  },
  {
    type: "anthropic/claude-sonnet-4.6",
    displayName: "Claude Sonnet 4.6",
    owner: "anthropic",
    created: 1_764_888_221,
    providers: [{ bedrock: "anthropic.claude-sonnet-4-6-v1:0" }],
    modality: "chat",
    free: false,
  },
  {
    type: "anthropic/claude-haiku-4.5",
    displayName: "Claude Haiku 4.5",
    owner: "anthropic",
    created: 1_764_888_221,
    providers: [{ bedrock: "anthropic.claude-haiku-4-5-20251001-v1:0" }],
    modality: "chat",
    free: false,
  },
  {
    type: "amazon/nova-2-multimodal-embeddings",
    displayName: "Amazon Nova 2 Multimodal Embeddings",
    owner: "amazon",
    created: 1_764_888_221,
    providers: [{ bedrock: "amazon.nova-2-multimodal-embeddings-v1:0" }],
    modality: "embeddings",
    free: true,
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
    modality: "embeddings",
    free: false,
  },
] as const;

export const modelHandlers = [
  http.get("/gateway/v1/models", ({ request }) => {
    const includeEndpoints = new URL(request.url).searchParams.get("endpoints") === "true";

    return HttpResponse.json({
      object: "list" as const,
      data: SUPPORTED_MODELS.map((model) =>
        Object.assign(
          {
            object: `model` as const,
            id: model.type,
            name: model.displayName,
            created: model.created,
            owned_by: model.owner,
            architecture: { output_modalities: [model.modality] },
            free: model.free,
          },
          includeEndpoints && {
            endpoints: Object.keys(model.providers[0]).map((tag) => ({ tag })),
          },
        ),
      ),
    });
  }),
];
