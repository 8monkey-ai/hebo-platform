import { z } from "zod";

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

export const ApiKeySchema = z.object({
  authMode: z.literal("api-key"),
  apiKey: z.string().trim().min(1).meta({ redact: true }),
});

export const AzureSchema = z.object({
  authMode: z.literal("resource-api-key"),
  resourceName: z.string().trim().min(1),
  apiKey: z.string().trim().min(1).meta({ redact: true }),
});

export const ProviderSchema = z.discriminatedUnion("slug", [
  z.object({
    slug: z.literal("anthropic"),
    name: z.literal("Anthropic"),
    config: z.discriminatedUnion("authMode", [ApiKeySchema]).optional(),
  }),
  z.object({
    slug: z.literal("azure"),
    name: z.literal("Microsoft Azure"),
    config: z.discriminatedUnion("authMode", [AzureSchema]).optional(),
  }),
  z.object({
    slug: z.literal("bedrock"),
    name: z.literal("Amazon Bedrock"),
    config: z
      .discriminatedUnion("authMode", [BedrockIamRoleSchema, BedrockAccessKeySchema])
      .optional(),
  }),
  z.object({
    slug: z.literal("groq"),
    name: z.literal("Groq"),
    config: z.discriminatedUnion("authMode", [ApiKeySchema]).optional(),
  }),
  z.object({
    slug: z.literal("openai"),
    name: z.literal("OpenAI"),
    config: z.discriminatedUnion("authMode", [ApiKeySchema]).optional(),
  }),
  z.object({
    slug: z.literal("vertex"),
    name: z.literal("Google Vertex"),
    config: z
      .discriminatedUnion("authMode", [VertexIdentityFederationSchema, VertexServiceAccountSchema])
      .optional(),
  }),
  z.object({
    slug: z.literal("voyage"),
    name: z.literal("Voyage"),
    config: z.discriminatedUnion("authMode", [ApiKeySchema]).optional(),
  }),
  z.object({
    slug: z.literal("deepseek"),
    name: z.literal("DeepSeek"),
    config: z.discriminatedUnion("authMode", [ApiKeySchema]).optional(),
  }),
  z.object({
    slug: z.literal("xai"),
    name: z.literal("xAI"),
    config: z.discriminatedUnion("authMode", [ApiKeySchema]).optional(),
  }),
  z.object({
    slug: z.literal("qwen"),
    name: z.literal("Alibaba"),
    config: z.discriminatedUnion("authMode", [ApiKeySchema]).optional(),
  }),
  z.object({
    slug: z.literal("minimax"),
    name: z.literal("MiniMax"),
    config: z.discriminatedUnion("authMode", [ApiKeySchema]).optional(),
  }),
  z.object({
    slug: z.literal("zhipu"),
    name: z.literal("Z.ai"),
    config: z.discriminatedUnion("authMode", [ApiKeySchema]).optional(),
  }),
  z.object({
    slug: z.literal("moonshot"),
    name: z.literal("Moonshot"),
    config: z.discriminatedUnion("authMode", [ApiKeySchema]).optional(),
  }),
  z.object({
    slug: z.literal("fireworks"),
    name: z.literal("Fireworks"),
    config: z.discriminatedUnion("authMode", [ApiKeySchema]).optional(),
  }),
  z.object({
    slug: z.literal("deepinfra"),
    name: z.literal("DeepInfra"),
    config: z.discriminatedUnion("authMode", [ApiKeySchema]).optional(),
  }),
  z.object({
    slug: z.literal("togetherai"),
    name: z.literal("Together AI"),
    config: z.discriminatedUnion("authMode", [ApiKeySchema]).optional(),
  }),
  z.object({
    slug: z.literal("chutes"),
    name: z.literal("Chutes"),
    config: z.discriminatedUnion("authMode", [ApiKeySchema]).optional(),
  }),
]);
export const ProviderSlugSchema = z.enum(ProviderSchema.options.map((o) => o.shape.slug.value));

export const ProviderConfigSchema = z.discriminatedUnion("authMode", [
  ...new Set(
    ProviderSchema.options.flatMap(
      (o) => o.shape.config.unwrap().options as z.core.$ZodTypeDiscriminable[],
    ),
  ),
] as [z.core.$ZodTypeDiscriminable, ...z.core.$ZodTypeDiscriminable[]]);

export const ProviderConfiguredSchema = z.object({
  configured: z.coerce.boolean().default(false).optional(),
});

export const ProvidersSchema = z.array(ProviderSchema);

export const ModelParametersSchema = z.object({
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  max_tokens: z.number().int().positive().optional(),
  reasoning: z
    .object({
      enabled: z.boolean().optional(),
      effort: z.enum(["none", "minimal", "low", "medium", "high", "xhigh", "max"]).optional(),
      max_tokens: z.number().int().positive().optional(),
      exclude: z.boolean().optional(),
      summary: z.enum(["none", "auto", "concise", "detailed"]).optional(),
    })
    .optional(),
  service_tier: z.enum(["default", "auto", "flex", "scale", "priority"]).optional(),
});

export const ModelConfigSchema = z.object({
  alias: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),
  type: z.string().min(1),
  routing: z
    .object({
      only: z
        .array(z.string().optional())
        .transform((value) => value.filter((v): v is string => v !== undefined)),
    })
    .optional(),
  parameters: ModelParametersSchema.optional(),
});

export const ModelsConfigSchema = z.array(ModelConfigSchema);

export type ApiKeyConfig = z.infer<typeof ApiKeySchema>;
export type AzureConfig = z.infer<typeof AzureSchema>;
export type BedrockConfig =
  | z.infer<typeof BedrockIamRoleSchema>
  | z.infer<typeof BedrockAccessKeySchema>;
export type VertexConfig =
  | z.infer<typeof VertexIdentityFederationSchema>
  | z.infer<typeof VertexServiceAccountSchema>;

export type ProviderSlug = z.infer<typeof ProviderSlugSchema>;
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;
export type Provider = z.infer<typeof ProviderSchema>;
export type Providers = z.infer<typeof ProvidersSchema>;

export type ModelParameters = z.infer<typeof ModelParametersSchema>;
export type ModelConfig = z.infer<typeof ModelConfigSchema>;
export type ModelsConfig = z.infer<typeof ModelsConfigSchema>;
