import { describe, expect, it } from "bun:test";

import { GatewayError } from "@hebo-ai/gateway";

import { resolveProvider } from "./model-resolver";

// Minimal mock for ResolveProviderHookContext
function makeCtx(overrides: {
  modelId: string;
  free?: boolean;
  requiresByok?: boolean;
  customProviderSlug?: string;
  organizationId?: string;
}) {
  return {
    resolvedModelId: overrides.modelId,
    state: {
      dbClient: {
        provider_configs: {
          getUnredacted: async () => {},
        },
      },
      organizationId: overrides.organizationId ?? "org-1",
      modelConfig: {
        type: overrides.modelId,
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
        modelId: "anthropic/claude-opus-4-6",
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
        modelId: "anthropic/claude-opus-4-6",
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
      expect(result).toBeUndefined();
    });
  });

  describe("requiresByok: false", () => {
    it("does not throw for non-free model without custom provider", async () => {
      const ctx = makeCtx({
        modelId: "anthropic/claude-opus-4-6",
        free: false,
        requiresByok: false,
      });
      const result = await resolveProvider(ctx);
      expect(result).toBeUndefined();
    });
  });
});
