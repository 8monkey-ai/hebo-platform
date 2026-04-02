import { defineModelCatalog, gateway } from "@hebo-ai/gateway";
import { nova2MultimodalEmbeddings } from "@hebo-ai/gateway/models/amazon";
import { claudeHaiku45, claudeOpus46, claudeSonnet46 } from "@hebo-ai/gateway/models/anthropic";
import { gemini } from "@hebo-ai/gateway/models/google";
import { gptOss20b, gptOss120b } from "@hebo-ai/gateway/models/openai";
import { voyage35 } from "@hebo-ai/gateway/models/voyage";
import { instrumentFetch } from "@hebo-ai/gateway/telemetry";
import { trace } from "@opentelemetry/api";

import { createOtelLogger } from "@hebo/shared-api/lib/otel";
import { createPinoOtelAdapter } from "@hebo/shared-api/utils/otel-pino";

import { before, onError, onRequest, resolveModelId, resolveProvider } from "./lib/hooks";
import { createProvider, loadProviderSecrets } from "./lib/provider";

// Disable Bun's hardcoded 5-minute fetch timeout (https://github.com/oven-sh/bun/issues/16682)
const _fetch = globalThis.fetch;
// @ts-expect-error -- Bun-specific `timeout` option not in standard RequestInit
globalThis.fetch = ((input, init) => _fetch(input, { ...init, timeout: false })) as typeof fetch;

instrumentFetch("full");

export const BASE_PATH = "/v1";

const SECRETS = await loadProviderSecrets();

const withTier = (modelId: string) => ({
  additionalProperties: {
    free: SECRETS.FREE_MODEL_IDS.has(modelId),
    requiresByok: SECRETS.ENFORCE_BYOK && !SECRETS.FREE_MODEL_IDS.has(modelId),
  },
});

export const gw = gateway({
  basePath: BASE_PATH,

  providers: {
    groq: createProvider("groq", { authMode: "api-key", apiKey: SECRETS.GROQ_API_KEY }),
    bedrock: createProvider("bedrock", {
      authMode: "iam-role",
      bedrockRoleArn: SECRETS.BEDROCK_ROLE_ARN,
      region: SECRETS.BEDROCK_REGION,
    }),
    vertex: createProvider("vertex", {
      authMode: "identity-federation",
      serviceAccountEmail: SECRETS.VERTEX_SERVICE_ACCOUNT_EMAIL,
      audience: SECRETS.VERTEX_AUDIENCE,
      location: SECRETS.VERTEX_LOCATION,
      project: SECRETS.VERTEX_PROJECT,
    }),
    voyage: createProvider("voyage", { authMode: "api-key", apiKey: SECRETS.VOYAGE_API_KEY }),
    anthropic: createProvider("anthropic", {
      authMode: "api-key",
      apiKey: SECRETS.ANTHROPIC_API_KEY,
    }),
    openai: createProvider("openai", { authMode: "api-key", apiKey: SECRETS.OPENAI_API_KEY }),
    azure: createProvider("azure", {
      authMode: "resource-api-key",
      resourceName: SECRETS.AZURE_RESOURCE_NAME,
      apiKey: SECRETS.AZURE_API_KEY,
    }),
  },

  models: defineModelCatalog(
    gptOss20b(withTier("openai/gpt-oss-20b")),
    gptOss120b(withTier("openai/gpt-oss-120b")),
    gemini["v3.x"].map((preset) => preset(withTier("google/gemini-2.5-pro"))),
    claudeOpus46(withTier("anthropic/claude-opus-4.6")),
    claudeSonnet46(withTier("anthropic/claude-sonnet-4.6")),
    claudeHaiku45(withTier("anthropic/claude-haiku-4.5")),
    nova2MultimodalEmbeddings(withTier("amazon/nova-2-multimodal-embeddings")),
    voyage35(withTier("voyage/voyage-3.5")),
  ),

  hooks: {
    onRequest,
    before,
    resolveModelId,
    resolveProvider,
    onError,
  },

  logger: createPinoOtelAdapter(createOtelLogger("hebo-gateway", 1)), // trace severity

  timeouts: {
    flex: 30 * 60_000, // 30 minutes
    normal: 5 * 60_000, // 5 minutes
  },

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
