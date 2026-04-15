import { createHash } from "node:crypto";

import type { ProviderV3 } from "@ai-sdk/provider";
import {
  CANONICAL_MODEL_IDS,
  GatewayError,
  type BeforeHookContext,
  type OnErrorHookContext,
  type OnRequestHookContext,
  type ResolveModelHookContext,
  type ResolveProviderHookContext,
} from "@hebo-ai/gateway";
import { LRUCache } from "lru-cache";

import type { createPrismaClient } from "~api/db/prisma";
import type { Models, ProviderSlug } from "~api/modules/providers/types";

import { injectMetadataCredentials } from "../utils/aws";
import { createProvider } from "./provider";

type PrismaClient = ReturnType<typeof createPrismaClient>;

const canonicalModelIds = new Set<string>(CANONICAL_MODEL_IDS);

const configCache = new LRUCache<string, string>({
  max: 100,
  ttl: 5 * 60 * 1000, // 5 minutes
});

const providerCache = new LRUCache<string, ProviderV3>({
  max: 100,
});

export function tagSpanWithOrganization(ctx: OnRequestHookContext) {
  const { organizationId } = ctx.state as { organizationId: string };
  ctx.otel["hebo.organization.id"] = organizationId;
}

export function injectDefaultCacheControl({ body, operation }: BeforeHookContext) {
  if (operation === "chat" || operation === "responses" || operation === "messages") {
    body.cache_control ??= { type: "ephemeral" };
  }
}

export async function bestEffortResolveModelOnError(ctx: OnErrorHookContext) {
  if (ctx.resolvedModelId) return;
  if (typeof ctx.body !== "object" || ctx.body === null) return;

  const modelId =
    "model" in ctx.body && typeof ctx.body.model === "string" ? ctx.body.model : undefined;
  if (!modelId) return;

  ctx.otel["gen_ai.request.model"] = modelId;

  if ("metadata" in ctx.body && typeof ctx.body.metadata === "object" && ctx.body.metadata !== null) {
    const metadata = ctx.body.metadata as Record<string, unknown>;
    for (const key in metadata) {
      ctx.otel[`gen_ai.request.metadata.${key}`] = String(metadata[key]);
    }
  }

  try {
    await resolveModelAlias({
      ...(ctx as unknown as Omit<ResolveModelHookContext, "modelId">),
      modelId,
    } as ResolveModelHookContext);
  } catch {
    // Best-effort: body may be partially valid, swallow resolution failures
  }
}

export async function resolveModelAlias(ctx: ResolveModelHookContext) {
  const { modelId: aliasPath, models, state } = ctx;

  const { prismaClient } = state as {
    prismaClient: PrismaClient;
  };

  if (canonicalModelIds.has(aliasPath)) {
    const modelConfig = models[aliasPath];
    state.modelConfig = {
      type: aliasPath,
      // Currently, we only support routing to the first provider.
      customProviderSlug: modelConfig?.providers[0],
      free: modelConfig?.additionalProperties?.free as boolean | undefined,
      requiresByok: modelConfig?.additionalProperties?.requiresByok as boolean | undefined,
    };
    return aliasPath;
  }

  const [agentSlug, branchSlug, modelAlias] = aliasPath.split("/");

  ctx.otel["hebo.agent.slug"] = agentSlug;
  ctx.otel["hebo.branch.slug"] = branchSlug;

  const branch = await prismaClient.branches.findFirst({
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

  const catalogModel = models[model.type as keyof typeof models];
  state.modelConfig = {
    type: model.type,
    // Currently, we only support routing to the first provider.
    customProviderSlug: model.routing?.only?.[0],
    free: catalogModel?.additionalProperties?.free as boolean | undefined,
    requiresByok: catalogModel?.additionalProperties?.requiresByok as boolean | undefined,
  };

  return model.type;
}

async function resolveCustomProvider(
  prismaClient: PrismaClient,
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

  const config = await prismaClient.provider_configs.getUnredacted(customProviderSlug);

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
    providerCache.set(providerCacheKey, provider);
  }

  return provider;
}

export async function selectProviderWithByokFallback(ctx: ResolveProviderHookContext) {
  const { resolvedModelId: modelId, models, providers, state } = ctx;

  const { prismaClient, organizationId } = state as {
    prismaClient: PrismaClient;
    organizationId: string;
  };

  if (modelId.startsWith("google/")) {
    await injectMetadataCredentials();
  }

  const { customProviderSlug, free, requiresByok } = state.modelConfig as {
    customProviderSlug?: ProviderSlug;
    free?: boolean;
    requiresByok?: boolean;
  };

  if (customProviderSlug) {
    const provider = await resolveCustomProvider(
      prismaClient,
      organizationId,
      modelId,
      customProviderSlug,
    );

    if (provider) return provider;
  }

  if (requiresByok && free === false) {
    throw new GatewayError(
      "This model requires Bring Your Own Key (BYOK). Configure your provider credentials in the console under Settings → Providers.",
      402,
      "BYOK_REQUIRED",
    );
  }

  // Default to bedrock if supported & available
  if (!customProviderSlug && providers.bedrock && models[modelId]?.providers.includes("bedrock")) {
    return providers.bedrock;
  }
}
