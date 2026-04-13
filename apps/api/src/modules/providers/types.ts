import { z } from "zod";

export const supportedProviders = {
  anthropic: { name: "Anthropic" },
  azure: { name: "Microsoft Azure" },
  bedrock: { name: "Amazon Bedrock" },
  groq: { name: "Groq" },
  openai: { name: "OpenAI" },
  vertex: { name: "Google Vertex AI" },
  voyage: { name: "Voyage AI" },
} as const;

export const ProviderSlug = z.enum(
  Object.keys(supportedProviders) as [string, ...string[]],
  { error: "Invalid provider slug" },
);

export const BedrockIamRoleConfig = z.object({
  authMode: z.literal("iam-role"),
  bedrockRoleArn: z.string().trim().min(1),
  region: z.string().trim().min(1),
});

export const BedrockAccessKeyConfig = z.object({
  authMode: z.literal("access-key"),
  accessKeyId: z.string().trim().min(1).meta({ redact: true }),
  secretAccessKey: z.string().trim().min(1).meta({ redact: true }),
  region: z.string().trim().min(1),
});

export const VertexIdentityFederationConfig = z.object({
  authMode: z.literal("identity-federation"),
  serviceAccountEmail: z.email(),
  audience: z.string().trim().min(1),
  location: z.string().trim().min(1),
  project: z.string().trim().min(1),
});

export const VertexServiceAccountConfig = z.object({
  authMode: z.literal("service-account"),
  clientEmail: z.email(),
  privateKey: z
    .string()
    .trim()
    .min(1)
    .transform((v) => v.replaceAll("\\n", "\n"))
    .meta({ redact: true, text: true }),
  location: z.string().trim().min(1),
  project: z.string().trim().min(1),
});

export const ApiKeyProviderConfig = z.object({
  authMode: z.literal("api-key"),
  apiKey: z.string().trim().min(1).meta({ redact: true }),
});

export const AzureProviderConfig = z.object({
  authMode: z.literal("resource-api-key"),
  resourceName: z.string().trim().min(1),
  apiKey: z.string().trim().min(1).meta({ redact: true }),
});

export const ProviderConfig = z.union([
  z.union([BedrockIamRoleConfig, BedrockAccessKeyConfig]),
  z.union([VertexIdentityFederationConfig, VertexServiceAccountConfig]),
  ApiKeyProviderConfig,
  AzureProviderConfig,
]);

export const Provider = z.object({
  slug: ProviderSlug,
  name: z.string(),
  config: ProviderConfig.optional(),
});

export const aliasPattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;

export const ModelConfig = z.object({
  alias: z.string().min(1).regex(aliasPattern),
  type: z.string().min(1),
  routing: z.object({ only: z.array(z.string()) }).optional(),
});

export const Models = z.array(ModelConfig);

export type Models = z.infer<typeof Models>;
export type ModelConfig = z.infer<typeof ModelConfig>;
export type BedrockIamRoleConfig = z.infer<typeof BedrockIamRoleConfig>;
export type BedrockAccessKeyConfig = z.infer<typeof BedrockAccessKeyConfig>;
export type VertexIdentityFederationConfig = z.infer<typeof VertexIdentityFederationConfig>;
export type VertexServiceAccountConfig = z.infer<typeof VertexServiceAccountConfig>;
export type ApiKeyProviderConfig = z.infer<typeof ApiKeyProviderConfig>;
export type AzureProviderConfig = z.infer<typeof AzureProviderConfig>;
export type BedrockProviderConfig = BedrockIamRoleConfig | BedrockAccessKeyConfig;
export type VertexProviderConfig = VertexIdentityFederationConfig | VertexServiceAccountConfig;
export type Provider = z.infer<typeof Provider>;
export type ProviderConfig = z.infer<typeof ProviderConfig>;
export type ProviderSlug = z.infer<typeof ProviderSlug>;
