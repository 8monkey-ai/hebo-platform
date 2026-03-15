import { describe, expect, it, mock, beforeEach } from "bun:test";

import { GatewayError, type ResolveProviderHookContext } from "@hebo-ai/gateway";

// Mutable flags object that the mocked module exports
const mockFlags = { enforceByok: false };

// Mock gateway-config — exports gatewayFlags as our mutable object
mock.module("../gateway-config", () => ({
  gatewayFlags: mockFlags,
  basePath: "/v1",
}));

// Mock aws-wif to avoid side effects
mock.module("./aws-wif", () => ({
  injectMetadataCredentials: mock(() => Promise.resolve()),
}));

// Mock provider-factory to avoid loading secrets
mock.module("./provider-factory", () => ({
  createProvider: mock(() => undefined),
  loadProviderSecrets: mock(() => Promise.resolve({})),
}));

// Dynamic import after mocks are in place
const { resolveProvider } = await import("./model-resolver");

function makeCtx(
  overrides: Partial<{
    modelId: string;
    free: boolean;
    customProviderSlug: string;
  }> = {},
): ResolveProviderHookContext {
  const modelId = overrides.modelId ?? "anthropic/claude-opus-4.6";
  return {
    request: new Request("http://localhost/v1/chat/completions", { method: "POST" }),
    operation: "chat",
    body: { model: modelId, messages: [] },
    modelId,
    resolvedModelId: modelId,
    models: {
      [modelId]: {
        providers: ["bedrock"],
        additionalProperties: { free: overrides.free ?? false },
      },
    },
    state: {
      modelConfig: {
        type: modelId,
        customProviderSlug: overrides.customProviderSlug,
      },
      dbClient: {
        provider_configs: {
          getUnredacted: mock(() => Promise.resolve(undefined)),
        },
      },
      organizationId: "org-test",
    },
  } as unknown as ResolveProviderHookContext;
}

describe("resolveProvider BYOK enforcement", () => {
  beforeEach(() => {
    mockFlags.enforceByok = false;
  });

  it("throws 402 BYOK_REQUIRED for non-free model when enforcement is enabled", async () => {
    mockFlags.enforceByok = true;

    try {
      await resolveProvider(makeCtx({ free: false }));
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(GatewayError);
      expect((err as GatewayError).status).toBe(402);
      expect((err as GatewayError).code).toBe("BYOK_REQUIRED");
    }
  });

  it("does not throw for free model when enforcement is enabled", async () => {
    mockFlags.enforceByok = true;

    const result = await resolveProvider(
      makeCtx({ modelId: "openai/gpt-oss-20b", free: true }),
    );
    expect(result).toBeUndefined();
  });

  it("does not throw for non-free model when enforcement is disabled", async () => {
    mockFlags.enforceByok = false;

    const result = await resolveProvider(makeCtx({ free: false }));
    expect(result).toBeUndefined();
  });

  it("throws 402 for non-free model with custom provider slug but no org credentials", async () => {
    mockFlags.enforceByok = true;

    try {
      await resolveProvider(makeCtx({ free: false, customProviderSlug: "bedrock" }));
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(GatewayError);
      expect((err as GatewayError).status).toBe(402);
      expect((err as GatewayError).code).toBe("BYOK_REQUIRED");
    }
  });
});
