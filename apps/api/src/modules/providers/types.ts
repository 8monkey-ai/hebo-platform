import { t, type Static } from "elysia";

export const supportedProviders = {
  anthropic: { name: "Anthropic" },
  azure: { name: "Microsoft Azure" },
  bedrock: { name: "Amazon Bedrock" },
  groq: { name: "Groq" },
  openai: { name: "OpenAI" },
  vertex: { name: "Google Vertex AI" },
  voyage: { name: "Voyage AI" },
} as const;

export const ProviderSlug = t.Enum(
  Object.fromEntries(Object.keys(supportedProviders).map((k) => [k, k])),
  { error: "Invalid provider slug" },
);

const BedrockIamRoleConfig = t.Object({
  authMode: t.Literal("iam-role"),
  bedrockRoleArn: t.String(),
  region: t.String(),
});

const BedrockAccessKeyConfig = t.Object({
  authMode: t.Literal("access-key"),
  accessKeyId: t.String({ "x-redact": true }),
  secretAccessKey: t.String({ "x-redact": true }),
  region: t.String(),
});

const BedrockProviderConfig = t.Union([BedrockIamRoleConfig, BedrockAccessKeyConfig]);

const VertexIdentityFederationConfig = t.Object({
  authMode: t.Literal("identity-federation"),
  serviceAccountEmail: t.String(),
  audience: t.String(),
  location: t.String(),
  project: t.String(),
});

const VertexServiceAccountConfig = t.Object({
  authMode: t.Literal("service-account"),
  clientEmail: t.String(),
  privateKey: t.String({ "x-redact": true }),
  location: t.String(),
  project: t.String(),
});

const VertexProviderConfig = t.Union([VertexIdentityFederationConfig, VertexServiceAccountConfig]);

const ApiKeyProviderConfig = t.Object({
  authMode: t.Literal("api-key"),
  apiKey: t.String({ "x-redact": true }),
});

const AzureProviderConfig = t.Object({
  authMode: t.Literal("resource-api-key"),
  resourceName: t.String(),
  apiKey: t.String({ "x-redact": true }),
});

export const ProviderConfig = t.Union([
  BedrockProviderConfig,
  VertexProviderConfig,
  ApiKeyProviderConfig,
  AzureProviderConfig,
]);

export const Provider = t.Object({
  slug: ProviderSlug,
  name: t.String(),
  config: t.Optional(ProviderConfig),
});

export const Models = t.Array(
  t.Object({
    alias: t.String({ minLength: 1, pattern: "^[a-zA-Z0-9][a-zA-Z0-9_-]*$" }),
    // FUTURE: Add a validation for the model type
    type: t.String({ minLength: 1 }),
    // Inspired from Vercel Provider Options: https://vercel.com/docs/ai-gateway/provider-options
    routing: t.Optional(t.Object({ only: t.Array(ProviderSlug) })),
  }),
);

export type Models = Static<typeof Models>;
export type BedrockIamRoleConfig = Static<typeof BedrockIamRoleConfig>;
export type BedrockAccessKeyConfig = Static<typeof BedrockAccessKeyConfig>;
export type BedrockProviderConfig = Static<typeof BedrockProviderConfig>;
export type VertexIdentityFederationConfig = Static<typeof VertexIdentityFederationConfig>;
export type VertexServiceAccountConfig = Static<typeof VertexServiceAccountConfig>;
export type VertexProviderConfig = Static<typeof VertexProviderConfig>;
export type ApiKeyProviderConfig = Static<typeof ApiKeyProviderConfig>;
export type AzureProviderConfig = Static<typeof AzureProviderConfig>;
export type Provider = Static<typeof Provider>;
export type ProviderConfig = Static<typeof ProviderConfig>;
export type ProviderSlug = Static<typeof ProviderSlug>;
