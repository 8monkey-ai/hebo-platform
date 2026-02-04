import { createHash } from "node:crypto";

import { LRUCache } from "lru-cache";

import type { createDbClient } from "~api/lib/db/client";

export type DbClient = ReturnType<typeof createDbClient>;
import type { Models, ProviderSlug } from "~api/modules/providers/types";

import { injectMetadataCredentials } from "./aws-wif";
import { createProvider } from "./provider-factory";

import type { ProviderV3 } from "@ai-sdk/provider";
import type {
  ResolveModelHookContext,
  ResolveProviderHookContext,
} from "@hebo-ai/gateway";

const configCache = new LRUCache<string, string>({
  max: 100,
  ttl: 5 * 60 * 1000, // 5 minutes
});

const providerCache = new LRUCache<string, ProviderV3>({
  max: 100,
});

export async function resolveModelId(ctx: ResolveModelHookContext) {
  const { modelId: aliasPath, state } = ctx;
  const { dbClient } = state as { dbClient: DbClient };

  const [agentSlug, branchSlug, modelAlias] = aliasPath.split("/");
  const branch = await dbClient.branches.findFirstOrThrow({
    where: { agent_slug: agentSlug, slug: branchSlug },
    select: { models: true },
  });

  const model = (branch.models as Models)?.find(
    ({ alias }) => alias === modelAlias,
  );

  if (!model) {
    throw new Error(`Missing model config for alias path ${aliasPath}`);
  }

  state.modelConfig = {
    type: model.type,
    customProviderSlug: model.routing?.only?.[0] as ProviderSlug | undefined,
  };

  return model.type;
}

export async function resolveProvider(ctx: ResolveProviderHookContext) {
  const { resolvedModelId: modelId, state } = ctx;
  const { dbClient } = state as { dbClient: DbClient };

  if (modelId.startsWith("google/")) {
    await injectMetadataCredentials();
  }

  const { customProviderSlug } = state.modelConfig as {
    customProviderSlug?: ProviderSlug;
  };

  if (customProviderSlug) {
    const configCacheKey = `${customProviderSlug}:${modelId}`;
    const cachedConfigHash = configCache.get(configCacheKey);

    if (cachedConfigHash) {
      const providerCacheKey = `${configCacheKey}:${cachedConfigHash}`;
      const cachedProvider = providerCache.get(providerCacheKey);

      if (cachedProvider) {
        return cachedProvider;
      }
    }

    const { value: config } =
      await dbClient.provider_configs.getUnredacted(customProviderSlug);

    const configHash = createHash("sha256")
      .update(JSON.stringify(config))
      .digest("hex");

    configCache.set(configCacheKey, configHash);

    const providerCacheKey = `${configCacheKey}:${configHash}`;
    let provider = providerCache.get(providerCacheKey);

    if (!provider) {
      provider = createProvider(customProviderSlug, config);
      providerCache.set(providerCacheKey, provider!);
    }

    return provider;
  }
}
