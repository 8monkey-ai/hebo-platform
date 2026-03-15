import { describe, expect, mock, test } from "bun:test";
import { GatewayError } from "@hebo-ai/gateway";

mock.module("../gateway-config", () => ({
  enforceByok: true,
  freeModelIds: new Set(["openai/gpt-oss-20b", "openai/gpt-oss-120b"]),
}));

mock.module("./aws-wif", () => ({
  injectMetadataCredentials: async () => {},
}));

mock.module("./provider-factory", () => ({
  createProvider: () => undefined,
}));

const { resolveProvider } = await import("./model-resolver");

type ResolveProviderCtx = Parameters<typeof resolveProvider>[0];

function makeProviderCtx(modelId: string, customProviderSlug?: string): ResolveProviderCtx {
  return {
    resolvedModelId: modelId,
    state: {
      dbClient: {
        provider_configs: {
          getUnredacted: async () => undefined,
        },
      },
      organizationId: "org-1",
      modelConfig: { customProviderSlug },
    },
  } as ResolveProviderCtx;
}

describe("resolveProvider BYOK enforcement", () => {
  test("non-free model without custom provider throws 402 BYOK_REQUIRED", async () => {
    const ctx = makeProviderCtx("anthropic/claude-opus-4.6");
    try {
      await resolveProvider(ctx);
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(GatewayError);
      expect((err as GatewayError).status).toBe(402);
      expect((err as GatewayError).code).toBe("BYOK_REQUIRED");
    }
  });

  test("non-free model with custom provider slug but no org credentials throws 402", async () => {
    const ctx = makeProviderCtx("anthropic/claude-opus-4.6", "bedrock");
    try {
      await resolveProvider(ctx);
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(GatewayError);
      expect((err as GatewayError).status).toBe(402);
      expect((err as GatewayError).code).toBe("BYOK_REQUIRED");
    }
  });

  test("free-tier model without custom provider does not throw", async () => {
    const ctx = makeProviderCtx("openai/gpt-oss-20b");
    const result = await resolveProvider(ctx);
    expect(result).toBeUndefined();
  });
});
