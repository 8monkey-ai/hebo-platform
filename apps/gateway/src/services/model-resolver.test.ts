import { describe, expect, it, mock } from "bun:test";

import { GatewayError, type ModelCatalog, type ResolveProviderHookContext } from "@hebo-ai/gateway";

import { resolveProvider } from "./model-resolver";

// Stub resolveCustomProvider's DB dependency by mocking the module-level import.
// We only need to exercise the BYOK gate, so provider resolution can return undefined.
mock.module("./aws-wif", () => ({
  injectMetadataCredentials: async () => {},
}));

function makeCtx(
  overrides: Partial<{
    modelId: string;
    monthlyFreeTokens: number;
    customProviderSlug: string | undefined;
  }> = {},
): ResolveProviderHookContext {
  const modelId = overrides.modelId ?? "anthropic/claude-opus-4.6";
  const monthlyFreeTokens = overrides.monthlyFreeTokens ?? 0;

  const models: ModelCatalog = {
    [modelId]: {
      providers: ["bedrock"],
      additionalProperties: {
        pricing: { monthly_free_tokens: monthlyFreeTokens },
      },
    },
  };

  return {
    request: new Request("http://localhost/v1/chat/completions", { method: "POST" }),
    operation: "chat",
    body: { model: modelId, messages: [] },
    modelId,
    resolvedModelId: modelId,
    models,
    providers: {},
    state: {
      dbClient: {
        provider_configs: {
          getUnredacted: async () => null,
        },
      },
      organizationId: "org-test",
      modelConfig: {
        type: modelId,
        customProviderSlug: overrides.customProviderSlug,
      },
    },
    requestId: "req-test",
  } as unknown as ResolveProviderHookContext;
}

describe("resolveProvider BYOK enforcement", () => {
  it("throws 402 BYOK_REQUIRED for non-free model without custom provider", async () => {
    const ctx = makeCtx({ monthlyFreeTokens: 0, customProviderSlug: undefined });

    try {
      await resolveProvider(ctx);
      expect.unreachable("Expected GatewayError to be thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(GatewayError);
      const gwErr = err as GatewayError;
      expect(gwErr.status).toBe(402);
      expect(gwErr.code).toBe("BYOK_REQUIRED");
    }
  });

  it("throws 402 BYOK_REQUIRED for non-free model with custom provider slug but no org credentials", async () => {
    const ctx = makeCtx({ monthlyFreeTokens: 0, customProviderSlug: "bedrock" });

    try {
      await resolveProvider(ctx);
      expect.unreachable("Expected GatewayError to be thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(GatewayError);
      const gwErr = err as GatewayError;
      expect(gwErr.status).toBe(402);
      expect(gwErr.code).toBe("BYOK_REQUIRED");
    }
  });

  it("does not throw for free-tier model without custom provider", async () => {
    const ctx = makeCtx({
      modelId: "openai/gpt-oss-20b",
      monthlyFreeTokens: 12_000_000_000,
      customProviderSlug: undefined,
    });

    const result = await resolveProvider(ctx);
    expect(result).toBeUndefined();
  });
});
