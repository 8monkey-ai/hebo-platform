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
    modality: "text->text",
    free: true,
  },
  {
    type: "anthropic/claude-sonnet-4.6",
    displayName: "Claude Sonnet 4.6",
    owner: "anthropic",
    created: 1_764_888_221,
    providers: [{ bedrock: "anthropic.claude-sonnet-4-6-v1:0" }],
    modality: "text->text",
    free: false,
  },
  {
    type: "anthropic/claude-haiku-4.5",
    displayName: "Claude Haiku 4.5",
    owner: "anthropic",
    created: 1_764_888_221,
    providers: [{ bedrock: "anthropic.claude-haiku-4-5-20251001-v1:0" }],
    modality: "text->text",
    free: false,
  },
  {
    type: "amazon/nova-2-multimodal-embeddings",
    displayName: "Nova 2 Embeddings",
    owner: "amazon",
    created: 1_764_888_221,
    providers: [{ bedrock: "amazon.nova-2-multimodal-embeddings-v1:0" }],
    modality: "text->embedding",
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
    modality: "text->embedding",
    free: false,
  },
  {
    type: "google/gemini-2.5-pro",
    displayName: "Gemini 2.5 Pro",
    owner: "google",
    created: 1_767_837_920,
    providers: [{ vertex: "gemini-2.5-pro" }],
    modality: "text->text",
    free: false,
  },
  {
    type: "mistral/mistral-large",
    displayName: "Mistral Large",
    owner: "mistral",
    created: 1_767_837_920,
    providers: [{ bedrock: "mistral.mistral-large-v1:0" }],
    modality: "text->text",
    free: false,
  },
  {
    type: "openai/gpt-4o-mini",
    displayName: "GPT-4o Mini",
    owner: "openai",
    created: 1_767_837_920,
    providers: [{ bedrock: "openai.gpt-4o-mini-v1:0" }],
    modality: "text->text",
    free: true,
  },
  {
    type: "openai/gpt-transcribe",
    displayName: "GPT Transcribe",
    owner: "openai",
    created: 1_785_283_200,
    providers: [{ openai: "gpt-transcribe" }],
    modality: "audio->text",
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
            architecture: {
              modality: model.modality,
              output_modalities: [model.modality.split("->")[1]],
            },
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
