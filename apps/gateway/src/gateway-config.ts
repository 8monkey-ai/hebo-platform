import { gateway, defineModelCatalog } from "@hebo-ai/gateway";
import { gemini } from "@hebo-ai/gateway/models/google";
import { gptOss20b, gptOss120b } from "@hebo-ai/gateway/models/openai";
import { voyage35 } from "@hebo-ai/gateway/models/voyage";

import {
  createProvider,
  loadProviderSecrets,
  ModelResolver,
} from "./services/model-resolver";

import type { DbClient } from "./services/model-resolver";

const basePath = "/v1";
const secrets = await loadProviderSecrets();

export { basePath };

const withPricing = (freeTokens: number) => ({
  additionalProperties: { pricing: { monthly_free_tokens: freeTokens } },
});

export const gw = gateway({
  basePath,

  providers: {
    groq: createProvider("groq", { apiKey: secrets.groqApiKey }),
    bedrock: createProvider("bedrock", {
      bedrockRoleArn: secrets.bedrockRoleArn,
      region: secrets.bedrockRegion,
    }),
    vertex: createProvider("vertex", {
      serviceAccountEmail: secrets.vertexServiceAccountEmail,
      audience: secrets.vertexAudience,
      location: secrets.vertexLocation,
      project: secrets.vertexProject,
    }),
    voyage: createProvider("voyage", { apiKey: secrets.voyageApiKey }),
  },

  models: defineModelCatalog(
    gptOss20b({
      providers: ["bedrock", "groq"],
      ...withPricing(12_000_000_000),
    }),
    gptOss120b({
      providers: ["bedrock", "groq"],
      ...withPricing(6_000_000_000),
    }),
    gemini["v3.x"].map((preset) =>
      preset({ providers: ["vertex"], ...withPricing(0) }),
    ),
    voyage35({ providers: ["voyage"], ...withPricing(0) }),
  ),

  hooks: {
    resolveModelId: async (ctx) =>
      new ModelResolver(
        (ctx.state as { dbClient: DbClient }).dbClient,
      ).resolveModelId(ctx.modelId!),

    resolveProvider: async (ctx) =>
      new ModelResolver(
        (ctx.state as { dbClient: DbClient }).dbClient,
      ).resolveProvider(ctx.resolvedModelId!, ctx.modelId!, ctx.providers),
  },
});
