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

const providerCache = new LRUCache<string, ProviderV3>({
  max: 100,
  ttl: 300_000, // 5 minutes
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
    const cacheKey = `${customProviderSlug}:${modelId}`;
    const cachedProvider = providerCache.get(cacheKey);

    if (cachedProvider) {
      return cachedProvider;
    }

    const { value: config } =
      await dbClient.provider_configs.getUnredacted(customProviderSlug);

    const provider = createProvider(customProviderSlug, config);
    providerCache.set(cacheKey, provider!);

    return provider;
  }
}
