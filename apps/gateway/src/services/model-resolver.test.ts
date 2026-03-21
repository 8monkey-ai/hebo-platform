import { describe, expect, it } from "bun:test";

import type { ProviderV3 } from "@ai-sdk/provider";
import { GatewayError } from "@hebo-ai/gateway";

import { resolveProvider } from "./model-resolver";

// Minimal mock for ResolveProviderHookContext
function makeCtx(overrides: {
  modelId: string;
  resolvedModelId?: string;
  free?: boolean;
  requiresByok?: boolean;
  customProviderSlug?: string;
  organizationId?: string;
  modelProviders?: string[];
  providerConfigsResult?: unknown;
  bedrockProvider?: ProviderV3 | undefined;
}) {
  const bedrockProvider = overrides.bedrockProvider ?? ({ id: "bedrock" } as unknown as ProviderV3);

  return {
    modelId: overrides.modelId,
    resolvedModelId: overrides.resolvedModelId ?? overrides.modelId,
    operation: "chat",
    request: new Request("https://example.com/v1/chat/completions", {
      method: "POST",
      body: JSON.stringify({ model: overrides.modelId, messages: [] }),
    }),
    body: { model: overrides.modelId, messages: [] },
    models: {
      [overrides.resolvedModelId ?? overrides.modelId]: {
        providers: overrides.modelProviders ?? ["anthropic", "bedrock", "vertex"],
      },
    },
    providers: {
      bedrock: bedrockProvider,
    },
    state: {
      prismaClient: {
        provider_configs: {
          getUnredacted: async () => overrides.providerConfigsResult,
        },
      },
      organizationId: overrides.organizationId ?? "org-1",
      modelConfig: {
        type: overrides.resolvedModelId ?? overrides.modelId,
        customProviderSlug: overrides.customProviderSlug,
        free: overrides.free,
        requiresByok: overrides.requiresByok,
      },
    },
  } as unknown as Parameters<typeof resolveProvider>[0];
}

describe("resolveProvider", () => {
  describe("requiresByok: true", () => {
    it("throws 402 BYOK_REQUIRED for non-free model without custom provider", async () => {
      const ctx = makeCtx({
        modelId: "anthropic/claude-opus-4.6",
        free: false,
        requiresByok: true,
      });
      try {
        await resolveProvider(ctx);
        expect.unreachable("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(GatewayError);
        expect((e as GatewayError).status).toBe(402);
        expect((e as GatewayError).code).toBe("BYOK_REQUIRED");
      }
    });

    it("throws 402 BYOK_REQUIRED for non-free model with custom provider slug but no credentials", async () => {
      const ctx = makeCtx({
        modelId: "anthropic/claude-opus-4.6",
        free: false,
        requiresByok: true,
        customProviderSlug: "bedrock",
      });
      try {
        await resolveProvider(ctx);
        expect.unreachable("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(GatewayError);
        expect((e as GatewayError).status).toBe(402);
        expect((e as GatewayError).code).toBe("BYOK_REQUIRED");
      }
    });

    it("does not throw for free model without custom provider", async () => {
      const ctx = makeCtx({ modelId: "openai/gpt-oss-20b", free: true, requiresByok: true });
      const result = await resolveProvider(ctx);
      expect(result).toBe(ctx.providers.bedrock);
    });
  });

  describe("requiresByok: false", () => {
    it("does not throw for non-free model without custom provider", async () => {
      const ctx = makeCtx({
        modelId: "anthropic/claude-opus-4.6",
        free: false,
        requiresByok: false,
      });
      const result = await resolveProvider(ctx);
      expect(result).toBe(ctx.providers.bedrock);
    });

    it("returns undefined when bedrock is not supported by the model", async () => {
      const ctx = makeCtx({
        modelId: "google/gemini-3.1-pro-preview",
        free: false,
        requiresByok: false,
        modelProviders: ["vertex"],
      });
      const result = await resolveProvider(ctx);
      expect(result).toBeUndefined();
    });

    it("returns undefined when bedrock is not configured", async () => {
      const ctx = makeCtx({
        modelId: "anthropic/claude-opus-4.6",
        free: false,
        requiresByok: false,
        bedrockProvider: undefined,
      });
      ctx.providers.bedrock = undefined;
      const result = await resolveProvider(ctx);
      expect(result).toBeUndefined();
    });

    it("prefers bedrock for aliased routes when the resolved model supports it", async () => {
      const ctx = makeCtx({
        modelId: "agent/main/copilot",
        resolvedModelId: "anthropic/claude-opus-4.6",
        free: false,
        requiresByok: false,
        customProviderSlug: "anthropic",
      });
      const result = await resolveProvider(ctx);
      expect(result).toBe(ctx.providers.bedrock);
    });
  });
});
