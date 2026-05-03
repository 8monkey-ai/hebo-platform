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
import type { ProviderSlug } from "~api/modules/providers/types";

import { injectMetadataCredentials } from "../utils/aws";
import { createProvider } from "./provider";

type PrismaClient = ReturnType<typeof createPrismaClient>;

const canonicalModelIds = new Set<string>(CANONICAL_MODEL_IDS);

type PresetCacheEntry = {
  canonicalModel: string;
  presetSlug: string;
};

// Use a sentinel for "looked up, not found" so TypeScript's LRUCache generic remains {}.
const PRESET_MISS: PresetCacheEntry = { canonicalModel: "", presetSlug: "" };

const presetCache = new LRUCache<string, PresetCacheEntry>({
  max: 500,
  ttl: 60 * 1000, // 60 seconds
});

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

  if (
    "metadata" in ctx.body &&
    typeof ctx.body.metadata === "object" &&
    ctx.body.metadata !== null
  ) {
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

async function lookupPreset(
  prismaClient: PrismaClient,
  workspaceId: string,
  slug: string,
): Promise<PresetCacheEntry | null> {
  const cacheKey = `${workspaceId}:${slug}`;
  const cached = presetCache.get(cacheKey);
  if (cached === PRESET_MISS) return null;
  if (cached) return cached;

  const preset = await prismaClient.presets.findFirst({
    where: { workspace_id: workspaceId, slug, deleted_at: null },
    select: { slug: true, model: true },
  });

  if (!preset) {
    presetCache.set(cacheKey, PRESET_MISS);
    return null;
  }

  const entry: PresetCacheEntry = {
    canonicalModel: preset.model,
    presetSlug: preset.slug,
  };
  presetCache.set(cacheKey, entry);
  return entry;
}

export async function resolveModelAlias(ctx: ResolveModelHookContext) {
  const { modelId, models, state } = ctx;

  const { prismaClient, workspaceId, workspaceSlug } = state as {
    prismaClient: PrismaClient;
    workspaceId?: string;
    workspaceSlug?: string;
  };

  if (workspaceSlug) {
    ctx.otel["hebo.workspace.slug"] = workspaceSlug;
  }

  // Presets-first — a preset can shadow a canonical model id.
  if (workspaceId) {
    const preset = await lookupPreset(prismaClient, workspaceId, modelId);
    if (preset) {
      ctx.otel["hebo.preset.slug"] = preset.presetSlug;
      const catalogModel = models[preset.canonicalModel as keyof typeof models];
      state.modelConfig = {
        type: preset.canonicalModel,
        free: catalogModel?.additionalProperties?.free as boolean | undefined,
        requiresByok: catalogModel?.additionalProperties?.requiresByok as boolean | undefined,
      };
      return preset.canonicalModel;
    }
  }

  if (canonicalModelIds.has(modelId)) {
    const modelConfig = models[modelId];
    state.modelConfig = {
      type: modelId,
      free: modelConfig?.additionalProperties?.free as boolean | undefined,
      requiresByok: modelConfig?.additionalProperties?.requiresByok as boolean | undefined,
    };
    return modelId;
  }

  throw new GatewayError(`Model not found: ${modelId}`, 404, "MODEL_NOT_FOUND");
}

async function resolveByokProvider(
  prismaClient: PrismaClient,
  organizationId: string,
  modelId: string,
  providerSlug: ProviderSlug,
): Promise<ProviderV3 | undefined> {
  const configCacheKey = `${organizationId}:${providerSlug}:${modelId}`;
  const cachedConfigHash = configCache.get(configCacheKey);

  if (cachedConfigHash) {
    if (cachedConfigHash === "default") return;
    const cachedProvider = providerCache.get(`${configCacheKey}:${cachedConfigHash}`);
    if (cachedProvider) return cachedProvider;
  }

  const config = await prismaClient.provider_configs.getUnredacted(providerSlug);

  const configHash = config
    ? createHash("sha256").update(JSON.stringify(config.value)).digest("hex")
    : "default";

  configCache.set(configCacheKey, configHash);

  if (!config) return;

  const providerCacheKey = `${configCacheKey}:${configHash}`;
  let provider = providerCache.get(providerCacheKey);

  if (!provider) {
    provider = createProvider(providerSlug, config.value);
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

  const { free, requiresByok } = state.modelConfig as {
    free?: boolean;
    requiresByok?: boolean;
  };

  const catalogProviders = (models[modelId]?.providers ?? []) as ProviderSlug[];

  // Pass 1 — BYOK-configured providers, in catalog order (preferred first).
  // Sequential on purpose: preferred providers are tried first and short-circuited.
  for (const providerSlug of catalogProviders) {
    // oxlint-disable-next-line no-await-in-loop
    const byokProvider = await resolveByokProvider(
      prismaClient,
      organizationId,
      modelId,
      providerSlug,
    );
    if (byokProvider) return byokProvider;
  }

  // BYOK-only models may not fall back to platform default providers.
  if (requiresByok && free === false) {
    throw new GatewayError(
      "This model requires Bring Your Own Key (BYOK). Configure your provider credentials in the console under Settings → Providers.",
      402,
      "BYOK_REQUIRED",
    );
  }

  // Pass 2 — platform-default providers, in catalog order.
  for (const providerSlug of catalogProviders) {
    const builtIn = providers[providerSlug];
    if (builtIn) return builtIn;
  }
}
