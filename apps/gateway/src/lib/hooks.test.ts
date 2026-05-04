import { describe, expect, it } from "bun:test";

import type { ProviderV3 } from "@ai-sdk/provider";
import { GatewayError, type ResolveProviderHookContext } from "@hebo-ai/gateway";

import { selectProviderWithByokFallback } from "./hooks";

// Minimal mock for ResolveProviderHookContext
function makeCtx(overrides: {
  modelId: string;
  resolvedModelId?: string;
  free?: boolean;
  requiresByok?: boolean;
  organizationId?: string;
  modelProviders?: string[];
  providerConfigsResult?: unknown;
  providers?: Partial<Record<string, ProviderV3 | undefined>>;
}) {
  return {
    modelId: overrides.modelId,
    resolvedModelId: overrides.resolvedModelId ?? overrides.modelId,
    requestId: "",
    otel: {},
    trace: undefined,
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
    providers: overrides.providers ?? { bedrock: {} as ProviderV3 },
    state: {
      prismaClient: {
        provider_configs: {
          getUnredacted: () => Promise.resolve(overrides.providerConfigsResult),
        },
      },
      organizationId: overrides.organizationId ?? "org-1",
      modelConfig: {
        type: overrides.resolvedModelId ?? overrides.modelId,
        free: overrides.free,
        requiresByok: overrides.requiresByok,
      },
    },
  } satisfies ResolveProviderHookContext;
}

describe("selectProviderWithByokFallback", () => {
  describe("requiresByok: true", () => {
    it("throws 402 BYOK_REQUIRED for non-free model without any BYOK provider configured", async () => {
      const ctx = makeCtx({
        modelId: "anthropic/claude-opus-4.6",
        free: false,
        requiresByok: true,
      });
      try {
        await selectProviderWithByokFallback(ctx);
        expect.unreachable("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(GatewayError);
        expect((e as GatewayError).status).toBe(402);
        expect((e as GatewayError).statusText).toBe("BYOK_REQUIRED");
      }
    });

    it("does not throw for free model — falls back to platform provider", async () => {
      const ctx = makeCtx({
        modelId: "openai/gpt-oss-20b",
        // org-${new Date().getTime()} avoids cache collision with the previous test
        organizationId: `org-${Date.now()}-free`,
        free: true,
        requiresByok: true,
      });
      const result = await selectProviderWithByokFallback(ctx);
      expect(result).toBe(ctx.providers.bedrock);
    });
  });

  describe("requiresByok: false", () => {
    it("falls back to the first platform-default provider in catalog order", async () => {
      const ctx = makeCtx({
        modelId: "anthropic/claude-opus-4.6",
        organizationId: `org-${Date.now()}-ok`,
        free: false,
        requiresByok: false,
      });
      const result = await selectProviderWithByokFallback(ctx);
      expect(result).toBe(ctx.providers.bedrock);
    });

    it("returns undefined when no catalog provider has platform credentials", async () => {
      const ctx = makeCtx({
        modelId: "google/gemini-3.1-pro-preview",
        organizationId: `org-${Date.now()}-none`,
        free: false,
        requiresByok: false,
        modelProviders: ["vertex"],
        providers: {},
      });
      const result = await selectProviderWithByokFallback(ctx);
      expect(result).toBeUndefined();
    });
  });
});
