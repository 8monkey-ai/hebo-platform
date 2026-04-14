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

export const ProviderSlugSchema = z.enum(Object.keys(supportedProviders) as [string, ...string[]], {
  error: "Invalid provider slug",
});

export const BedrockIamRoleSchema = z.object({
  authMode: z.literal("iam-role"),
  bedrockRoleArn: z.string().trim().min(1),
  region: z.string().trim().min(1),
});

export const BedrockAccessKeySchema = z.object({
  authMode: z.literal("access-key"),
  accessKeyId: z.string().trim().min(1).meta({ redact: true }),
  secretAccessKey: z.string().trim().min(1).meta({ redact: true }),
  region: z.string().trim().min(1),
});

export const VertexIdentityFederationSchema = z.object({
  authMode: z.literal("identity-federation"),
  serviceAccountEmail: z.email(),
  audience: z.string().trim().min(1),
  location: z.string().trim().min(1),
  project: z.string().trim().min(1),
});

export const VertexServiceAccountSchema = z.object({
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

export const ApiKeyProviderSchema = z.object({
  authMode: z.literal("api-key"),
  apiKey: z.string().trim().min(1).meta({ redact: true }),
});

export const AzureProviderSchema = z.object({
  authMode: z.literal("resource-api-key"),
  resourceName: z.string().trim().min(1),
  apiKey: z.string().trim().min(1).meta({ redact: true }),
});

export const ProviderConfigSchema = z.union([
  z.union([BedrockIamRoleSchema, BedrockAccessKeySchema]),
  z.union([VertexIdentityFederationSchema, VertexServiceAccountSchema]),
  ApiKeyProviderSchema,
  AzureProviderSchema,
]);

export const ProviderSchema = z.object({
  slug: ProviderSlugSchema,
  name: z.string(),
  config: ProviderConfigSchema.optional(),
});

export const aliasPattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;

export const ModelConfigSchema = z.object({
  alias: z.string().min(1).regex(aliasPattern),
  type: z.string().min(1),
  routing: z
    .object({
      only: z
        .array(z.string().optional())
        .transform((value) => value.filter((v): v is string => v !== undefined)),
    })
    .optional(),
});

export const ModelsSchema = z.array(ModelConfigSchema);

export type Models = z.infer<typeof ModelsSchema>;
export type ModelConfigSchema = z.infer<typeof ModelConfigSchema>;
export type BedrockIamRoleSchema = z.infer<typeof BedrockIamRoleSchema>;
export type BedrockAccessKeySchema = z.infer<typeof BedrockAccessKeySchema>;
export type VertexIdentityFederationSchema = z.infer<typeof VertexIdentityFederationSchema>;
export type VertexServiceAccountSchema = z.infer<typeof VertexServiceAccountSchema>;
export type ApiKeyProviderSchema = z.infer<typeof ApiKeyProviderSchema>;
export type AzureProviderSchema = z.infer<typeof AzureProviderSchema>;
export type BedrockProviderConfig = BedrockIamRoleSchema | BedrockAccessKeySchema;
export type VertexProviderConfig = VertexIdentityFederationSchema | VertexServiceAccountSchema;
export type ProviderSchema = z.infer<typeof ProviderSchema>;
export type ProviderConfigSchema = z.infer<typeof ProviderConfigSchema>;
export type ProviderSlugSchema = z.infer<typeof ProviderSlugSchema>;
