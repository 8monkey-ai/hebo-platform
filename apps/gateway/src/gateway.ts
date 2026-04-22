import { defineModelCatalog, gateway } from "@hebo-ai/gateway";
import { qwen } from "@hebo-ai/gateway/models/alibaba";
import { nova2MultimodalEmbeddings } from "@hebo-ai/gateway/models/amazon";
import { claudeHaiku45, claudeOpus46, claudeSonnet46 } from "@hebo-ai/gateway/models/anthropic";
import { deepseek } from "@hebo-ai/gateway/models/deepseek";
import { gemini } from "@hebo-ai/gateway/models/google";
import { minimax } from "@hebo-ai/gateway/models/minimax";
import { kimi } from "@hebo-ai/gateway/models/moonshot";
import { gptOss20b, gptOss120b } from "@hebo-ai/gateway/models/openai";
import { voyage35 } from "@hebo-ai/gateway/models/voyage";
import { grok } from "@hebo-ai/gateway/models/xai";
import { glm } from "@hebo-ai/gateway/models/zai";
import { instrumentFetch } from "@hebo-ai/gateway/telemetry";
import { trace } from "@opentelemetry/api";

import { getLogger } from "@hebo/shared-api/lib/logger";

import {
  bestEffortResolveModelOnError,
  injectDefaultCacheControl,
  resolveModelAlias,
  selectProviderWithByokFallback,
  tagSpanWithOrganization,
} from "./lib/hooks";
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
    anthropic: createProvider("anthropic", {
      authMode: "api-key",
      apiKey: SECRETS.ANTHROPIC_API_KEY,
    }),
    azure: createProvider("azure", {
      authMode: "resource-api-key",
      resourceName: SECRETS.FOUNDRY_RESOURCE_NAME,
      apiKey: SECRETS.FOUNDRY_API_KEY,
    }),
    bedrock: createProvider("bedrock", {
      authMode: "iam-role",
      bedrockRoleArn: SECRETS.BEDROCK_ROLE_ARN,
      region: SECRETS.BEDROCK_REGION,
    }),
    groq: createProvider("groq", { authMode: "api-key", apiKey: SECRETS.GROQ_API_KEY }),
    openai: createProvider("openai", { authMode: "api-key", apiKey: SECRETS.OPENAI_API_KEY }),
    vertex: createProvider("vertex", {
      authMode: "identity-federation",
      serviceAccountEmail: SECRETS.VERTEX_SERVICE_ACCOUNT_EMAIL,
      audience: SECRETS.VERTEX_AUDIENCE,
      location: SECRETS.VERTEX_LOCATION,
      project: SECRETS.VERTEX_PROJECT,
    }),
    voyage: createProvider("voyage", { authMode: "api-key", apiKey: SECRETS.VOYAGE_API_KEY }),
    deepseek: createProvider("deepseek", { authMode: "api-key", apiKey: SECRETS.DEEPSEEK_API_KEY }),
    xai: createProvider("xai", { authMode: "api-key", apiKey: SECRETS.XAI_API_KEY }),
    qwen: createProvider("qwen", { authMode: "api-key", apiKey: SECRETS.QWEN_API_KEY }),
    minimax: createProvider("minimax", { authMode: "api-key", apiKey: SECRETS.MINIMAX_API_KEY }),
    zhipu: createProvider("zhipu", { authMode: "api-key", apiKey: SECRETS.ZHIPU_API_KEY }),
    moonshot: createProvider("moonshot", { authMode: "api-key", apiKey: SECRETS.MOONSHOT_API_KEY }),
    fireworks: createProvider("fireworks", { authMode: "api-key", apiKey: SECRETS.FIREWORKS_API_KEY }),
    deepinfra: createProvider("deepinfra", { authMode: "api-key", apiKey: SECRETS.DEEPINFRA_API_KEY }),
    togetherai: createProvider("togetherai", {
      authMode: "api-key",
      apiKey: SECRETS.TOGETHERAI_API_KEY,
    }),
    chutes: createProvider("chutes", { authMode: "api-key", apiKey: SECRETS.CHUTES_API_KEY }),
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
    deepseek.all.map((preset) => preset(withTier("deepseek/deepseek-v3.2"))),
    grok.all.map((preset) => preset(withTier("xai/grok-4.2"))),
    qwen.all.map((preset) => preset(withTier("qwen/qwen-3.5"))),
    minimax.all.map((preset) => preset(withTier("minimax/minimax-m2"))),
    glm.all.map((preset) => preset(withTier("zhipu/glm-5"))),
    kimi.all.map((preset) => preset(withTier("moonshot/kimi-k2"))),
  ),

  hooks: {
    onRequest: tagSpanWithOrganization,
    before: injectDefaultCacheControl,
    resolveModelId: resolveModelAlias,
    resolveProvider: selectProviderWithByokFallback,
    onError: bestEffortResolveModelOnError,
  },

  logger: getLogger("hebo-gateway"),

  advanced: {
    timeouts: {
      flex: 30 * 60_000, // 30 minutes
      normal: 5 * 60_000, // 5 minutes
    },
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
