import QuickLRU from "quick-lru";

import type { createDbClient } from "~api/lib/db/client";

export type DbClient = ReturnType<typeof createDbClient>;
import type { Models, ProviderSlug } from "~api/modules/providers/types";

import { injectMetadataCredentials } from "./aws-wif";
import { createProvider } from "./provider-factory";

import type { ProviderV3 } from "@ai-sdk/provider";
import type { HookContext } from "@hebo-ai/gateway";

const providerCache = new QuickLRU<string, ProviderV3>({ maxSize: 100 });

export async function resolveModelId(ctx: HookContext) {
  const { modelId: aliasPath, state } = ctx;
  const { dbClient } = state as { dbClient: DbClient };

  // TODO: Remove this as soon the new Hebo AI Gateway version is released
  if (!aliasPath) {
    throw new Error("Missing modelId in context");
  }

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

export async function resolveProvider(ctx: HookContext) {
  const { resolvedModelId: modelId, providers: defaultProviders, state } = ctx;
  const { dbClient } = state as { dbClient: DbClient };

  // TODO: Remove this as soon the new Hebo AI Gateway version is released
  if (!modelId) {
    return;
  }

  if (modelId.startsWith("google/")) {
    await injectMetadataCredentials();
  }

  const { customProviderSlug } = state.modelConfig as {
    customProviderSlug?: ProviderSlug;
  };

  if (customProviderSlug) {
    const { value: config } =
      await dbClient.provider_configs.getUnredacted(customProviderSlug);

    const cacheKey = `${customProviderSlug}:${modelId}:${JSON.stringify(config)}`;
    let provider = providerCache.get(cacheKey);

    if (!provider) {
      provider = createProvider(customProviderSlug, config);
      providerCache.set(cacheKey, provider);
    }

    return provider;
  }

  if (modelId.startsWith("openai/") && !defaultProviders.bedrock) {
    return defaultProviders.groq;
  }
}
