import { t, type Static } from "elysia";

export const supportedProviders = {
  bedrock: { name: "Amazon Bedrock" },
  vertex: { name: "Google Vertex AI" },
  groq: { name: "Groq" },
  voyage: { name: "Voyage AI" },
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

export const Models = t.Array(
  t.Object({
    alias: t.String({ minLength: 1 }),
    // FUTURE: Add a validation for the model type
    type: t.String({ minLength: 1 }),
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
