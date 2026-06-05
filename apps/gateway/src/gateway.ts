import { type ModelCatalog, defineModelCatalog, gateway } from "@hebo-ai/gateway";
import { qwen } from "@hebo-ai/gateway/models/alibaba";
import { nova } from "@hebo-ai/gateway/models/amazon";
import { claude } from "@hebo-ai/gateway/models/anthropic";
import { deepseek } from "@hebo-ai/gateway/models/deepseek";
import { gemini, gemma } from "@hebo-ai/gateway/models/google";
import { minimax } from "@hebo-ai/gateway/models/minimax";
import { kimi } from "@hebo-ai/gateway/models/moonshot";
import { gpt, gptOss, textEmbeddings } from "@hebo-ai/gateway/models/openai";
import { voyage } from "@hebo-ai/gateway/models/voyage";
import { grok } from "@hebo-ai/gateway/models/xai";
import { glm } from "@hebo-ai/gateway/models/zai";
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
const originalFetch = globalThis.fetch;
globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
  originalFetch(input, { ...init, timeout: false } as RequestInit)) as typeof fetch;

export const BASE_PATH = "/v1";

const SECRETS = await loadProviderSecrets();

const withTier = (modelId: string) => ({
  additionalProperties: {
    free: SECRETS.FREE_MODEL_IDS.has(modelId),
    requiresByok: SECRETS.ENFORCE_BYOK && !SECRETS.FREE_MODEL_IDS.has(modelId),
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tiered = (preset: (override?: any) => ModelCatalog): ModelCatalog => {
  const modelId = Object.keys(preset({}))[0];
  return preset(withTier(modelId));
};

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
    fireworks: createProvider("fireworks", {
      authMode: "api-key",
      apiKey: SECRETS.FIREWORKS_API_KEY,
    }),
    deepinfra: createProvider("deepinfra", {
      authMode: "api-key",
      apiKey: SECRETS.DEEPINFRA_API_KEY,
    }),
    togetherai: createProvider("togetherai", {
      authMode: "api-key",
      apiKey: SECRETS.TOGETHERAI_API_KEY,
    }),
    chutes: createProvider("chutes", { authMode: "api-key", apiKey: SECRETS.CHUTES_API_KEY }),
  },

  models: defineModelCatalog(
    claude.all.map(tiered),
    gpt.all.map(tiered),
    gptOss.all.map(tiered),
    textEmbeddings.all.map(tiered),
    gemini.all.map(tiered),
    gemma.all.map(tiered),
    nova.all.map(tiered),
    voyage.all.map(tiered),
    deepseek.all.map(tiered),
    grok.all.map(tiered),
    qwen.all.map(tiered),
    minimax.all.map(tiered),
    glm.all.map(tiered),
    kimi.all.map(tiered),
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
