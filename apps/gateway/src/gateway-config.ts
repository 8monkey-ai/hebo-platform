import { defineModelCatalog, gateway } from "@hebo-ai/gateway";
import type { ChatCompletionsBody } from "@hebo-ai/gateway/endpoints/chat-completions";
import { nova2MultimodalEmbeddings } from "@hebo-ai/gateway/models/amazon";
import { claudeHaiku45, claudeOpus46, claudeSonnet46 } from "@hebo-ai/gateway/models/anthropic";
import { gemini } from "@hebo-ai/gateway/models/google";
import { gptOss20b, gptOss120b } from "@hebo-ai/gateway/models/openai";
import { voyage35 } from "@hebo-ai/gateway/models/voyage";
import { GrepTimeDialect, SqlStorage } from "@hebo-ai/gateway/storage/sql";
import { instrumentFetch } from "@hebo-ai/gateway/telemetry";
import { trace } from "@opentelemetry/api";

import { greptimeSqlClient } from "@hebo/shared-api/lib/db/greptime";
import { getOtelLogger } from "@hebo/shared-api/lib/otel";
import { createPinoOtelAdapter } from "@hebo/shared-api/utils/otel-pino-adapter";

import { OrgScopedStorage } from "./services/org-scoped-storage";
import { resolveModelId, resolveProvider } from "./services/model-resolver";
import { createProvider, loadProviderSecrets } from "./services/provider-factory";

instrumentFetch("full");

export const basePath = "/v1";
const secrets = await loadProviderSecrets();

const sqlStorage = new SqlStorage({
  dialect: new GrepTimeDialect({ client: greptimeSqlClient }),
});
await sqlStorage.migrate();
const storage = new OrgScopedStorage(sqlStorage);

const withTier = (modelId: string) => ({
  additionalProperties: {
    free: secrets.freeModelIds.has(modelId),
    requiresByok: secrets.enforceByok && !secrets.freeModelIds.has(modelId),
  },
});

export const gw = gateway({
  basePath,
  storage,

  providers: {
    groq: createProvider("groq", { authMode: "api-key", apiKey: secrets.groqApiKey }),
    bedrock: createProvider("bedrock", {
      authMode: "iam-role",
      bedrockRoleArn: secrets.bedrockRoleArn,
      region: secrets.bedrockRegion,
    }),
    vertex: createProvider("vertex", {
      authMode: "identity-federation",
      serviceAccountEmail: secrets.vertexServiceAccountEmail,
      audience: secrets.vertexAudience,
      location: secrets.vertexLocation,
      project: secrets.vertexProject,
    }),
    voyage: createProvider("voyage", { authMode: "api-key", apiKey: secrets.voyageApiKey }),
    anthropic: createProvider("anthropic", {
      authMode: "api-key",
      apiKey: secrets.anthropicApiKey,
    }),
    openai: createProvider("openai", { authMode: "api-key", apiKey: secrets.openAiApiKey }),
    azure: createProvider("azure", {
      authMode: "resource-api-key",
      resourceName: secrets.azureResourceName,
      apiKey: secrets.azureApiKey,
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
    before: ({ body, operation }) => {
      if (operation === "chat") {
        (body as ChatCompletionsBody).cache_control ??= { type: "ephemeral" };
      }
    },
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
