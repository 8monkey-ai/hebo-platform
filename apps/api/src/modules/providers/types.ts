import { t, type Static } from "elysia";

const SUPPORTED_MODELS = [
  "google/gemini-3-pro-preview",
  "google/gemini-3-flash-preview",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "anthropic/claude-opus-4-5-v1",
  "cohere/embed-v4.0",
];

export const supportedProviders = {
  bedrock: { name: "Amazon Bedrock" },
  cohere: { name: "Cohere" },
  groq: { name: "Groq" },
  vertex: { name: "Google Vertex AI" },
} as const;

export const ProviderSlug = t.Enum(
  Object.fromEntries(Object.keys(supportedProviders).map((k) => [k, k])),
  { error: "Invalid provider slug" },
);

const BedrockProviderConfig = t.Object({
  bedrockRoleArn: t.String(),
  region: t.String(),
});

const VertexProviderConfig = t.Object({
  serviceAccountEmail: t.String(),
  audience: t.String(),
  location: t.String(),
  project: t.String(),
});

const ApiKeyProviderConfig = t.Object({
  apiKey: t.String({ "x-redact": true }),
});

export const ProviderConfig = t.Union([
  BedrockProviderConfig,
  VertexProviderConfig,
  ApiKeyProviderConfig,
]);

export const Provider = t.Object({
  slug: ProviderSlug,
  name: t.String(),
  config: t.Optional(ProviderConfig),
});

export const SupportedModelType = t.Enum(
  Object.fromEntries(SUPPORTED_MODELS.map((model) => [model, model])),
  { error: "Invalid model type" },
);

export const Models = t.Array(
  t.Object({
    alias: t.String({ minLength: 1 }),
    type: SupportedModelType,
    // Inspired from Vercel Provider Options: https://vercel.com/docs/ai-gateway/provider-options
    routing: t.Optional(t.Object({ only: t.Array(ProviderSlug) })),
  }),
);

export type Models = Static<typeof Models>;
export type BedrockProviderConfig = Static<typeof BedrockProviderConfig>;
export type VertexProviderConfig = Static<typeof VertexProviderConfig>;
export type ApiKeyProviderConfig = Static<typeof ApiKeyProviderConfig>;
export type Provider = Static<typeof Provider>;
export type ProviderConfig = Static<typeof ProviderConfig>;
export type ProviderSlug = Static<typeof ProviderSlug>;
