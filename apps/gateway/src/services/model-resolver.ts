import { createHash } from "node:crypto";

import type { ProviderV3 } from "@ai-sdk/provider";
import {
  CANONICAL_MODEL_IDS,
  GatewayError,
  type ResolveModelHookContext,
  type ResolveProviderHookContext,
} from "@hebo-ai/gateway";
import { trace } from "@opentelemetry/api";
import { LRUCache } from "lru-cache";

import type { createDbClient } from "~api/lib/db/client";
import type { Models, ProviderSlug } from "~api/modules/providers/types";

import { injectMetadataCredentials } from "./aws-wif";
import { createProvider } from "./provider-factory";

export type DbClient = ReturnType<typeof createDbClient>;

const canonicalModelIds = new Set<string>(CANONICAL_MODEL_IDS);

const configCache = new LRUCache<string, string>({
  max: 100,
  ttl: 5 * 60 * 1000, // 5 minutes
});

const providerCache = new LRUCache<string, ProviderV3>({
  max: 100,
});

export async function resolveModelId(ctx: ResolveModelHookContext) {
  const { modelId: aliasPath, models, state } = ctx;

  if (canonicalModelIds.has(aliasPath)) {
    const modelConfig = models[aliasPath as keyof typeof models];
    state.modelConfig = {
      type: aliasPath,
      // Currently, we only support routing to the first provider.
      customProviderSlug: modelConfig?.providers[0] as ProviderSlug,
    };
    return aliasPath;
  }

  const { dbClient } = state as { dbClient: DbClient };

  const [agentSlug, branchSlug, modelAlias] = aliasPath.split("/");

  const activeSpan = trace.getActiveSpan();
  if (activeSpan) {
    activeSpan.setAttributes({
      "hebo.agent.slug": agentSlug!,
      "hebo.branch.slug": branchSlug!,
    });
  }

  const branch = await dbClient.branches.findFirst({
    where: { agent_slug: agentSlug, slug: branchSlug },
    select: { models: true },
  });

  if (!branch) {
    throw new GatewayError(`Model alias not found: ${aliasPath}`, 404, "MODEL_NOT_FOUND");
  }

  const model = (branch.models as Models)?.find(({ alias }) => alias === modelAlias);

  if (!model) {
    throw new GatewayError(`Model alias not found: ${aliasPath}`, 404, "MODEL_NOT_FOUND");
  }

  state.modelConfig = {
    type: model.type,
    // Currently, we only support routing to the first provider.
    customProviderSlug: model.routing?.only?.[0] as ProviderSlug | undefined,
  };

  return model.type;
}

async function resolveCustomProvider(
  dbClient: DbClient,
  organizationId: string,
  modelId: string,
  customProviderSlug: ProviderSlug,
): Promise<ProviderV3 | undefined> {
  const configCacheKey = `${organizationId}:${customProviderSlug}:${modelId}`;
  const cachedConfigHash = configCache.get(configCacheKey);

  if (cachedConfigHash) {
    // No custom config exists, use default providers
    if (cachedConfigHash === "default") return;

    const cachedProvider = providerCache.get(`${configCacheKey}:${cachedConfigHash}`);
    if (cachedProvider) return cachedProvider;
  }

  const config = await dbClient.provider_configs.getUnredacted(customProviderSlug);

  const configHash = config
    ? createHash("sha256").update(JSON.stringify(config.value)).digest("hex")
    : "default";

  configCache.set(configCacheKey, configHash);

  // If no config is found, return undefined to use the default providers.
  if (!config) return;

  const providerCacheKey = `${configCacheKey}:${configHash}`;
  let provider = providerCache.get(providerCacheKey);

  if (!provider) {
    provider = createProvider(customProviderSlug, config.value);
    providerCache.set(providerCacheKey, provider!);
  }

  return provider;
}

export async function resolveProvider(ctx: ResolveProviderHookContext) {
  const { resolvedModelId: modelId, state } = ctx;
  const { dbClient, organizationId } = state as {
    dbClient: DbClient;
    organizationId: string;
  };

  if (modelId.startsWith("google/")) {
    await injectMetadataCredentials();
  }

  const { customProviderSlug } = state.modelConfig as {
    customProviderSlug?: ProviderSlug;
  };

  if (customProviderSlug) {
    return resolveCustomProvider(dbClient, organizationId, modelId, customProviderSlug);
  }
}
