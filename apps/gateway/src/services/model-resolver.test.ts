import { describe, expect, it } from "bun:test";

import { GatewayError } from "@hebo-ai/gateway";

import { createResolveProvider } from "./model-resolver";

// Minimal mock for ResolveProviderHookContext
function makeCtx(overrides: {
  modelId: string;
  free?: boolean;
  customProviderSlug?: string;
  organizationId?: string;
}) {
  return {
    resolvedModelId: overrides.modelId,
    state: {
      dbClient: {
        provider_configs: {
          getUnredacted: async () => undefined,
        },
      },
      organizationId: overrides.organizationId ?? "org-1",
      modelConfig: {
        type: overrides.modelId,
        customProviderSlug: overrides.customProviderSlug,
        free: overrides.free,
      },
    },
  } as unknown as Parameters<ReturnType<typeof createResolveProvider>>[0];
}

describe("createResolveProvider", () => {
  describe("enforceByok: true", () => {
    const resolveProvider = createResolveProvider({ enforceByok: true });

    it("throws 402 BYOK_REQUIRED for non-free model without custom provider", async () => {
      const ctx = makeCtx({ modelId: "anthropic/claude-opus-4-6", free: false });
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
        modelId: "anthropic/claude-opus-4-6",
        free: false,
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
      const ctx = makeCtx({ modelId: "openai/gpt-oss-20b", free: true });
      const result = await resolveProvider(ctx);
      expect(result).toBeUndefined();
    });
  });

  describe("enforceByok: false", () => {
    const resolveProvider = createResolveProvider({ enforceByok: false });

    it("does not throw for non-free model without custom provider", async () => {
      const ctx = makeCtx({ modelId: "anthropic/claude-opus-4-6", free: false });
      const result = await resolveProvider(ctx);
      expect(result).toBeUndefined();
    });
  });
});
