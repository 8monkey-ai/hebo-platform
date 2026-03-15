import { defineModelCatalog, gateway } from "@hebo-ai/gateway";
import { claudeOpus46 } from "@hebo-ai/gateway/models/anthropic";
import { gemini } from "@hebo-ai/gateway/models/google";
import { gptOss20b, gptOss120b } from "@hebo-ai/gateway/models/openai";
import { voyage35 } from "@hebo-ai/gateway/models/voyage";
import { instrumentFetch } from "@hebo-ai/gateway/telemetry";
import { trace } from "@opentelemetry/api";

import { getOtelLogger } from "@hebo/shared-api/lib/otel";
import { createPinoOtelAdapter } from "@hebo/shared-api/utils/otel-pino-adapter";

import { resolveModelId, resolveProvider } from "./services/model-resolver";
import { createProvider, loadProviderSecrets } from "./services/provider-factory";

instrumentFetch("full");

export const basePath = "/v1";
const secrets = await loadProviderSecrets();

const DEFAULT_FREE_MODEL_IDS = "openai/gpt-oss-20b,openai/gpt-oss-120b";

export const freeModelIds = new Set(
  (secrets.freeModelIds ?? DEFAULT_FREE_MODEL_IDS)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

export const enforceByok = secrets.enforceByok === "true";

const withTier = (modelId: string) => ({
  additionalProperties: { free: freeModelIds.has(modelId) },
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
      ...withTier("openai/gpt-oss-20b"),
    }),
    gptOss120b({
      providers: ["bedrock", "groq"],
      ...withTier("openai/gpt-oss-120b"),
    }),
    gemini["v3.x"].map((preset) => preset({ providers: ["vertex"], ...withTier("google/gemini") })),
    claudeOpus46({ providers: ["bedrock"], ...withTier("anthropic/claude-opus-4-6") }),
    voyage35({ providers: ["voyage"], ...withTier("voyage/voyage-3.5") }),
  ),

  hooks: {
    resolveModelId,
    resolveProvider,
  },
  logger: createPinoOtelAdapter(getOtelLogger("hebo-gateway", 1)), // trace severity
  telemetry: {
    enabled: true,
    tracer: trace.getTracer("hebo-gateway"),
    signals: {
      gen_ai: "full",
      http: "recommended",
      hebo: "full",
    },
  },
});
