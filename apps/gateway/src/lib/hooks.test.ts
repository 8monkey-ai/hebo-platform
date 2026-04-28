import { describe, expect, it } from "bun:test";

import type { ProviderV3 } from "@ai-sdk/provider";
import {
  GatewayError,
  type ResolveModelHookContext,
  type ResolveProviderHookContext,
} from "@hebo-ai/gateway";

import type { ModelParameters } from "~api/modules/providers/types";

import { injectModelParameters, selectProviderWithByokFallback } from "./hooks";

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
    providers: {
      bedrock: overrides.bedrockProvider,
    },
    state: {
      prismaClient: {
        provider_configs: {
          getUnredacted: () => Promise.resolve(overrides.providerConfigsResult),
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
  } satisfies ResolveProviderHookContext;
}

describe("selectProviderWithByokFallback", () => {
  describe("requiresByok: true", () => {
    it("throws 402 BYOK_REQUIRED for non-free model without custom provider", async () => {
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

    it("throws 402 BYOK_REQUIRED for non-free model with custom provider slug but no credentials", async () => {
      const ctx = makeCtx({
        modelId: "anthropic/claude-opus-4.6",
        free: false,
        requiresByok: true,
        customProviderSlug: "bedrock",
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

    it("does not throw for free model without custom provider", async () => {
      const ctx = makeCtx({ modelId: "openai/gpt-oss-20b", free: true, requiresByok: true });
      const result = await selectProviderWithByokFallback(ctx);
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
      const result = await selectProviderWithByokFallback(ctx);
      expect(result).toBe(ctx.providers.bedrock);
    });

    it("returns undefined when bedrock is not supported by the model", async () => {
      const ctx = makeCtx({
        modelId: "google/gemini-3.1-pro-preview",
        free: false,
        requiresByok: false,
        modelProviders: ["vertex"],
      });
      const result = await selectProviderWithByokFallback(ctx);
      expect(result).toBeUndefined();
    });

    it("returns undefined when bedrock is not configured", async () => {
      const ctx = makeCtx({
        modelId: "anthropic/claude-opus-4.6",
        free: false,
        requiresByok: false,
        bedrockProvider: undefined,
      });
      const result = await selectProviderWithByokFallback(ctx);
      expect(result).toBeUndefined();
    });

    it("returns undefined when a custom provider slug is set but unresolved", async () => {
      const ctx = makeCtx({
        modelId: "agent/main/copilot",
        resolvedModelId: "anthropic/claude-opus-4.6",
        free: false,
        requiresByok: false,
        customProviderSlug: "anthropic",
      });
      const result = await selectProviderWithByokFallback(ctx);
      expect(result).toBeUndefined();
    });
  });
});

describe("injectModelParameters", () => {
  /** Shorthand — tests use partial body stubs. */
  const body = (fields: Record<string, unknown> = {}) => fields as ResolveModelHookContext["body"];

  describe("simple parameters", () => {
    it("injects temperature when missing from body", () => {
      const b = body();
      injectModelParameters(b, { temperature: 0.5 }, "chat");
      expect((b as Record<string, unknown>).temperature).toBe(0.5);
    });

    it("does not override client-provided temperature", () => {
      const b = body({ temperature: 0.2 });
      injectModelParameters(b, { temperature: 0.5 }, "chat");
      expect((b as Record<string, unknown>).temperature).toBe(0.2);
    });

    it("injects top_p when missing from body", () => {
      const b = body();
      injectModelParameters(b, { top_p: 0.9 }, "messages");
      expect((b as Record<string, unknown>).top_p).toBe(0.9);
    });

    it("injects service_tier when missing from body", () => {
      const b = body();
      injectModelParameters(b, { service_tier: "flex" }, "chat");
      expect((b as Record<string, unknown>).service_tier).toBe("flex");
    });

    it("does not override client-provided service_tier", () => {
      const b = body({ service_tier: "auto" });
      injectModelParameters(b, { service_tier: "flex" }, "chat");
      expect((b as Record<string, unknown>).service_tier).toBe("auto");
    });
  });

  describe("max_tokens", () => {
    it("injects only max_completion_tokens for chat", () => {
      const b = body();
      injectModelParameters(b, { max_tokens: 4096 }, "chat");
      const raw = b as Record<string, unknown>;
      expect(raw.max_completion_tokens).toBe(4096);
      expect(raw.max_tokens).toBeUndefined();
    });

    it("injects only max_tokens for messages", () => {
      const b = body();
      injectModelParameters(b, { max_tokens: 4096 }, "messages");
      const raw = b as Record<string, unknown>;
      expect(raw.max_tokens).toBe(4096);
      expect(raw.max_completion_tokens).toBeUndefined();
    });

    it("injects only max_output_tokens for responses", () => {
      const b = body();
      injectModelParameters(b, { max_tokens: 4096 }, "responses");
      const raw = b as Record<string, unknown>;
      expect(raw.max_output_tokens).toBe(4096);
      expect(raw.max_tokens).toBeUndefined();
      expect(raw.max_completion_tokens).toBeUndefined();
    });

    it("does not override client-provided max_tokens", () => {
      const b = body({ max_tokens: 8192 });
      injectModelParameters(b, { max_tokens: 4096 }, "messages");
      expect((b as Record<string, unknown>).max_tokens).toBe(8192);
    });
  });

  describe("reasoning — chat/responses", () => {
    it("injects reasoning and reasoning_effort for chat", () => {
      const params: ModelParameters = {
        reasoning: { enabled: true, effort: "high", max_tokens: 10000 },
      };
      const b = body();
      injectModelParameters(b, params, "chat");
      const raw = b as Record<string, unknown>;
      expect(raw.reasoning).toEqual(params.reasoning);
      expect(raw.reasoning_effort).toBe("high");
    });

    it("does not override client-provided reasoning for responses", () => {
      const clientReasoning = { enabled: true, effort: "low" as const };
      const b = body({ reasoning: clientReasoning });
      injectModelParameters(b, { reasoning: { effort: "high" } }, "responses");
      expect((b as Record<string, unknown>).reasoning).toEqual(clientReasoning);
    });
  });

  describe("reasoning — messages (thinking translation)", () => {
    it("translates reasoning to thinking object with enabled type", () => {
      const b = body();
      injectModelParameters(b, { reasoning: { enabled: true, max_tokens: 32000 } }, "messages");
      expect((b as Record<string, unknown>).thinking).toEqual({
        type: "enabled",
        budget_tokens: 32000,
      });
    });

    it("translates reasoning to adaptive type when enabled is not set", () => {
      const b = body();
      injectModelParameters(b, { reasoning: { max_tokens: 16000 } }, "messages");
      expect((b as Record<string, unknown>).thinking).toEqual({
        type: "adaptive",
        budget_tokens: 16000,
      });
    });

    it("does not inject thinking when reasoning.enabled is false", () => {
      const b = body();
      injectModelParameters(b, { reasoning: { enabled: false } }, "messages");
      expect((b as Record<string, unknown>).thinking).toBeUndefined();
    });

    it("does not override client-provided thinking", () => {
      const clientThinking = { type: "enabled", budget_tokens: 64000 };
      const b = body({ thinking: clientThinking });
      injectModelParameters(b, { reasoning: { enabled: true, max_tokens: 32000 } }, "messages");
      expect((b as Record<string, unknown>).thinking).toEqual(clientThinking);
    });

    it("does not inject reasoning/reasoning_effort for messages", () => {
      const b = body();
      injectModelParameters(b, { reasoning: { enabled: true, effort: "high" } }, "messages");
      const raw = b as Record<string, unknown>;
      expect(raw.reasoning).toBeUndefined();
      expect(raw.reasoning_effort).toBeUndefined();
    });
  });

  describe("multiple parameters", () => {
    it("injects all provided defaults at once", () => {
      const b = body();
      const params: ModelParameters = {
        temperature: 0.7,
        top_p: 0.95,
        max_tokens: 4096,
        service_tier: "auto",
      };
      injectModelParameters(b, params, "messages");
      const raw = b as Record<string, unknown>;
      expect(raw.temperature).toBe(0.7);
      expect(raw.top_p).toBe(0.95);
      expect(raw.max_tokens).toBe(4096);
      expect(raw.service_tier).toBe("auto");
    });

    it("only fills missing parameters, preserving client values", () => {
      const b = body({ temperature: 0.2, max_tokens: 8192 });
      const params: ModelParameters = {
        temperature: 0.7,
        top_p: 0.95,
        max_tokens: 4096,
      };
      injectModelParameters(b, params, "messages");
      const raw = b as Record<string, unknown>;
      expect(raw.temperature).toBe(0.2);
      expect(raw.top_p).toBe(0.95);
      expect(raw.max_tokens).toBe(8192);
    });
  });

  describe("no-op", () => {
    it("does not modify body when params are empty", () => {
      const b = body({ temperature: 0.5 });
      injectModelParameters(b, {}, "chat");
      expect(b).toEqual({ temperature: 0.5 } as ResolveModelHookContext["body"]);
    });
  });
});
