import { createHash } from "node:crypto";

import type { ProviderV3 } from "@ai-sdk/provider";
import {
  CANONICAL_MODEL_IDS,
  GatewayError,
  type BeforeHookContext,
  type CatalogModel,
  type OnErrorHookContext,
  type OnRequestHookContext,
  type ResolveModelHookContext,
  type ResolveProviderHookContext,
} from "@hebo-ai/gateway";
import { LRUCache } from "lru-cache";

import type { createPrismaClient } from "~api/db/prisma";
import type { ModelParameters, ModelsConfig, ProviderSlug } from "~api/modules/providers/types";

import { injectMetadataCredentials } from "../utils/aws";
import { createProvider } from "./provider";

type PrismaClient = ReturnType<typeof createPrismaClient>;

const canonicalModelIds = new Set<string>(CANONICAL_MODEL_IDS);

function readMeta(model?: CatalogModel) {
  const p = model?.additionalProperties as
    | { free?: boolean; requiresByok?: boolean; defaults?: ModelParameters }
    | undefined;
  return { free: p?.free, requiresByok: p?.requiresByok, defaults: p?.defaults ?? {} };
}

const configCache = new LRUCache<string, string>({
  max: 100,
  ttl: 5 * 60 * 1000, // 5 minutes
});

const providerCache = new LRUCache<string, ProviderV3>({
  max: 100,
});

/** Injects default inference parameters into the request body. Client values always win (??= semantics). */
export function injectModelParameters(
  body: Record<string, unknown>,
  params: ModelParameters,
  operation: string,
) {
  body.temperature ??= params.temperature;
  body.top_p ??= params.top_p;
  body.frequency_penalty ??= params.frequency_penalty;
  body.presence_penalty ??= params.presence_penalty;
  body.seed ??= params.seed;
  body.service_tier ??= params.service_tier;

  if (operation === "chat") {
    body.max_completion_tokens ??= params.max_tokens;
    body.stop ??= params.stop;
    if (params.reasoning) {
      body.reasoning ??= params.reasoning;
      body.reasoning_effort ??= params.reasoning.effort;
    }
  } else if (operation === "messages") {
    body.max_tokens ??= params.max_tokens;
    if (params.stop !== undefined) {
      body.stop_sequences ??= Array.isArray(params.stop) ? params.stop : [params.stop];
    }
    if (params.reasoning && !body.thinking && params.reasoning.enabled !== false) {
      const thinking: Record<string, unknown> = {
        type: params.reasoning.enabled ? "enabled" : "adaptive",
      };
      if (params.reasoning.max_tokens) thinking.budget_tokens = params.reasoning.max_tokens;
      if (params.reasoning.exclude || params.reasoning.summary === "none") {
        thinking.display = "omitted";
      } else if (params.reasoning.summary) {
        thinking.display = "summarized";
      }
      body.thinking = thinking;
    }
  } else {
    body.max_output_tokens ??= params.max_tokens;
    if (params.reasoning) {
      body.reasoning ??= params.reasoning;
      body.reasoning_effort ??= params.reasoning.effort;
    }
  }
}

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

export async function resolveModelAlias(ctx: ResolveModelHookContext) {
  const { modelId: aliasPath, models, state } = ctx;

  const { prismaClient } = state as {
    prismaClient: PrismaClient;
  };

  if (canonicalModelIds.has(aliasPath)) {
    const modelConfig = models[aliasPath];
    const { free, requiresByok, defaults } = readMeta(modelConfig);
    state.modelConfig = {
      type: aliasPath,
      // Currently, we only support routing to the first provider.
      customProviderSlug: modelConfig?.providers[0],
      free,
      requiresByok,
    };

    injectModelParameters(ctx.body, defaults, ctx.operation);
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

  const model = (branch.models as ModelsConfig)?.find(({ alias }) => alias === modelAlias);

  if (!model) {
    throw new GatewayError(`Model alias not found: ${aliasPath}`, 404, "MODEL_NOT_FOUND");
  }

  const catalogModel = models[model.type as keyof typeof models];
  const { free, requiresByok, defaults } = readMeta(catalogModel);
  state.modelConfig = {
    type: model.type,
    // Currently, we only support routing to the first provider.
    customProviderSlug: model.routing?.only?.[0],
    free,
    requiresByok,
  };

  const params = model.parameters ? { ...defaults, ...model.parameters } : defaults;
  injectModelParameters(ctx.body, params, ctx.operation);
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
