import { defineModelCatalog, gateway } from "@hebo-ai/gateway";
import { gemini } from "@hebo-ai/gateway/models/google";
import { gptOss20b, gptOss120b } from "@hebo-ai/gateway/models/openai";
import { voyage35 } from "@hebo-ai/gateway/models/voyage";
import pino from "pino";

import { logLevel } from "@hebo/shared-api/env";

import { resolveModelId, resolveProvider } from "./services/model-resolver";
import {
  createProvider,
  loadProviderSecrets,
} from "./services/provider-factory";

export const basePath = "/v1";
const secrets = await loadProviderSecrets();

const withFreeTokens = (freeTokens: number) => ({
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
      ...withFreeTokens(12_000_000_000),
    }),
    gptOss120b({
      providers: ["bedrock", "groq"],
      ...withFreeTokens(6_000_000_000),
    }),
    gemini["v3.x"].map((preset) =>
      preset({ providers: ["vertex"], ...withFreeTokens(0) }),
    ),
    voyage35({ providers: ["voyage"], ...withFreeTokens(0) }),
  ),

  hooks: {
    resolveModelId,
    resolveProvider,
  },
  logger: pino({ level: logLevel }),
});
