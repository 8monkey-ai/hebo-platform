import { describe, expect, it } from "bun:test";

import type { ProviderV3 } from "@ai-sdk/provider";
import { GatewayError, type ResolveProviderHookContext } from "@hebo-ai/gateway";

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
  describe("simple parameters", () => {
    it("injects temperature when missing from body", () => {
      const body: Record<string, unknown> = {};
      injectModelParameters(body, { temperature: 0.5 }, "chat");
      expect(body.temperature).toBe(0.5);
    });

    it("does not override client-provided temperature", () => {
      const body: Record<string, unknown> = { temperature: 0.2 };
      injectModelParameters(body, { temperature: 0.5 }, "chat");
      expect(body.temperature).toBe(0.2);
    });

    it("injects top_p when missing from body", () => {
      const body: Record<string, unknown> = {};
      injectModelParameters(body, { top_p: 0.9 }, "messages");
      expect(body.top_p).toBe(0.9);
    });

    it("injects service_tier when missing from body", () => {
      const body: Record<string, unknown> = {};
      injectModelParameters(body, { service_tier: "flex" }, "chat");
      expect(body.service_tier).toBe("flex");
    });

    it("does not override client-provided service_tier", () => {
      const body: Record<string, unknown> = { service_tier: "auto" };
      injectModelParameters(body, { service_tier: "flex" }, "chat");
      expect(body.service_tier).toBe("auto");
    });
  });

  describe("max_tokens", () => {
    it("injects only max_completion_tokens for chat", () => {
      const body: Record<string, unknown> = {};
      injectModelParameters(body, { max_tokens: 4096 }, "chat");
      expect(body.max_completion_tokens).toBe(4096);
      expect(body.max_tokens).toBeUndefined();
    });

    it("injects only max_tokens for messages", () => {
      const body: Record<string, unknown> = {};
      injectModelParameters(body, { max_tokens: 4096 }, "messages");
      expect(body.max_tokens).toBe(4096);
      expect(body.max_completion_tokens).toBeUndefined();
    });

    it("injects only max_output_tokens for responses", () => {
      const body: Record<string, unknown> = {};
      injectModelParameters(body, { max_tokens: 4096 }, "responses");
      expect(body.max_output_tokens).toBe(4096);
      expect(body.max_tokens).toBeUndefined();
      expect(body.max_completion_tokens).toBeUndefined();
    });

    it("does not override client-provided max_tokens", () => {
      const body: Record<string, unknown> = { max_tokens: 8192 };
      injectModelParameters(body, { max_tokens: 4096 }, "messages");
      expect(body.max_tokens).toBe(8192);
    });
  });

  describe("reasoning — chat/responses", () => {
    it("injects reasoning and reasoning_effort for chat", () => {
      const params: ModelParameters = {
        reasoning: { enabled: true, effort: "high", max_tokens: 10000 },
      };
      const body: Record<string, unknown> = {};
      injectModelParameters(body, params, "chat");
      expect(body.reasoning).toEqual(params.reasoning);
      expect(body.reasoning_effort).toBe("high");
    });

    it("does not override client-provided reasoning for responses", () => {
      const clientReasoning = { enabled: true, effort: "low" as const };
      const body: Record<string, unknown> = { reasoning: clientReasoning };
      injectModelParameters(body, { reasoning: { effort: "high" } }, "responses");
      expect(body.reasoning).toEqual(clientReasoning);
    });
  });

  describe("reasoning — messages (thinking translation)", () => {
    it("translates reasoning to thinking object with enabled type", () => {
      const body: Record<string, unknown> = {};
      injectModelParameters(body, { reasoning: { enabled: true, max_tokens: 32000 } }, "messages");
      expect(body.thinking).toEqual({ type: "enabled", budget_tokens: 32000 });
    });

    it("translates reasoning to adaptive type when enabled is not set", () => {
      const body: Record<string, unknown> = {};
      injectModelParameters(body, { reasoning: { max_tokens: 16000 } }, "messages");
      expect(body.thinking).toEqual({ type: "adaptive", budget_tokens: 16000 });
    });

    it("does not inject thinking when reasoning.enabled is false", () => {
      const body: Record<string, unknown> = {};
      injectModelParameters(body, { reasoning: { enabled: false } }, "messages");
      expect(body.thinking).toBeUndefined();
    });

    it("does not override client-provided thinking", () => {
      const clientThinking = { type: "enabled", budget_tokens: 64000 };
      const body: Record<string, unknown> = { thinking: clientThinking };
      injectModelParameters(body, { reasoning: { enabled: true, max_tokens: 32000 } }, "messages");
      expect(body.thinking).toEqual(clientThinking);
    });

    it("does not inject reasoning/reasoning_effort for messages", () => {
      const body: Record<string, unknown> = {};
      injectModelParameters(body, { reasoning: { enabled: true, effort: "high" } }, "messages");
      expect(body.reasoning).toBeUndefined();
      expect(body.reasoning_effort).toBeUndefined();
    });

    it("translates summary: 'auto' to display: 'summarized'", () => {
      const body: Record<string, unknown> = {};
      injectModelParameters(
        body,
        { reasoning: { enabled: true, max_tokens: 32000, summary: "auto" } },
        "messages",
      );
      expect(body.thinking).toEqual({
        type: "enabled",
        budget_tokens: 32000,
        display: "summarized",
      });
    });

    it("translates summary: 'concise' to display: 'summarized'", () => {
      const body: Record<string, unknown> = {};
      injectModelParameters(
        body,
        { reasoning: { enabled: true, max_tokens: 32000, summary: "concise" } },
        "messages",
      );
      expect(body.thinking).toEqual({
        type: "enabled",
        budget_tokens: 32000,
        display: "summarized",
      });
    });

    it("translates summary: 'none' to display: 'omitted'", () => {
      const body: Record<string, unknown> = {};
      injectModelParameters(
        body,
        { reasoning: { enabled: true, max_tokens: 32000, summary: "none" } },
        "messages",
      );
      expect(body.thinking).toEqual({ type: "enabled", budget_tokens: 32000, display: "omitted" });
    });

    it("translates exclude: true to display: 'omitted'", () => {
      const body: Record<string, unknown> = {};
      injectModelParameters(
        body,
        { reasoning: { enabled: true, max_tokens: 32000, exclude: true } },
        "messages",
      );
      expect(body.thinking).toEqual({ type: "enabled", budget_tokens: 32000, display: "omitted" });
    });

    it("exclude takes precedence over summary", () => {
      const body: Record<string, unknown> = {};
      injectModelParameters(
        body,
        { reasoning: { enabled: true, max_tokens: 32000, exclude: true, summary: "auto" } },
        "messages",
      );
      expect(body.thinking).toEqual({ type: "enabled", budget_tokens: 32000, display: "omitted" });
    });
  });

  describe("multiple parameters", () => {
    it("injects all provided defaults at once", () => {
      const body: Record<string, unknown> = {};
      const params: ModelParameters = {
        temperature: 0.7,
        top_p: 0.95,
        max_tokens: 4096,
        service_tier: "auto",
      };
      injectModelParameters(body, params, "messages");
      expect(body.temperature).toBe(0.7);
      expect(body.top_p).toBe(0.95);
      expect(body.max_tokens).toBe(4096);
      expect(body.service_tier).toBe("auto");
    });

    it("only fills missing parameters, preserving client values", () => {
      const body: Record<string, unknown> = { temperature: 0.2, max_tokens: 8192 };
      const params: ModelParameters = {
        temperature: 0.7,
        top_p: 0.95,
        max_tokens: 4096,
      };
      injectModelParameters(body, params, "messages");
      expect(body.temperature).toBe(0.2);
      expect(body.top_p).toBe(0.95);
      expect(body.max_tokens).toBe(8192);
    });
  });

  describe("no-op", () => {
    it("does not modify body when params are empty", () => {
      const body: Record<string, unknown> = { temperature: 0.5 };
      injectModelParameters(body, {}, "chat");
      expect(body).toEqual({ temperature: 0.5 });
    });
  });

  describe("frequency_penalty", () => {
    it("injects frequency_penalty when missing from body", () => {
      const body: Record<string, unknown> = {};
      injectModelParameters(body, { frequency_penalty: 0.5 }, "chat");
      expect(body.frequency_penalty).toBe(0.5);
    });

    it("does not override client-provided frequency_penalty", () => {
      const body: Record<string, unknown> = { frequency_penalty: 0.8 };
      injectModelParameters(body, { frequency_penalty: 0.5 }, "chat");
      expect(body.frequency_penalty).toBe(0.8);
    });

    it("injects frequency_penalty for messages", () => {
      const body: Record<string, unknown> = {};
      injectModelParameters(body, { frequency_penalty: 0.3 }, "messages");
      expect(body.frequency_penalty).toBe(0.3);
    });

    it("injects frequency_penalty for responses", () => {
      const body: Record<string, unknown> = {};
      injectModelParameters(body, { frequency_penalty: 0.3 }, "responses");
      expect(body.frequency_penalty).toBe(0.3);
    });
  });

  describe("presence_penalty", () => {
    it("injects presence_penalty when missing from body", () => {
      const body: Record<string, unknown> = {};
      injectModelParameters(body, { presence_penalty: 0.6 }, "chat");
      expect(body.presence_penalty).toBe(0.6);
    });

    it("does not override client-provided presence_penalty", () => {
      const body: Record<string, unknown> = { presence_penalty: 1.0 };
      injectModelParameters(body, { presence_penalty: 0.6 }, "chat");
      expect(body.presence_penalty).toBe(1.0);
    });

    it("injects presence_penalty for messages", () => {
      const body: Record<string, unknown> = {};
      injectModelParameters(body, { presence_penalty: -0.5 }, "messages");
      expect(body.presence_penalty).toBe(-0.5);
    });
  });

  describe("seed", () => {
    it("injects seed when missing from body", () => {
      const body: Record<string, unknown> = {};
      injectModelParameters(body, { seed: 42 }, "chat");
      expect(body.seed).toBe(42);
    });

    it("does not override client-provided seed", () => {
      const body: Record<string, unknown> = { seed: 99 };
      injectModelParameters(body, { seed: 42 }, "chat");
      expect(body.seed).toBe(99);
    });

    it("injects seed for messages", () => {
      const body: Record<string, unknown> = {};
      injectModelParameters(body, { seed: 42 }, "messages");
      expect(body.seed).toBe(42);
    });
  });

  describe("stop", () => {
    it("injects stop for chat as-is (string)", () => {
      const body: Record<string, unknown> = {};
      injectModelParameters(body, { stop: "\n" }, "chat");
      expect(body.stop).toBe("\n");
    });

    it("injects stop for chat as-is (array)", () => {
      const body: Record<string, unknown> = {};
      injectModelParameters(body, { stop: ["\n", "END"] }, "chat");
      expect(body.stop).toEqual(["\n", "END"]);
    });

    it("does not override client-provided stop for chat", () => {
      const body: Record<string, unknown> = { stop: "STOP" };
      injectModelParameters(body, { stop: "\n" }, "chat");
      expect(body.stop).toBe("STOP");
    });

    it("translates stop to stop_sequences for messages (string)", () => {
      const body: Record<string, unknown> = {};
      injectModelParameters(body, { stop: "\n" }, "messages");
      expect(body.stop_sequences).toEqual(["\n"]);
      expect(body.stop).toBeUndefined();
    });

    it("translates stop to stop_sequences for messages (array)", () => {
      const body: Record<string, unknown> = {};
      injectModelParameters(body, { stop: ["\n", "END"] }, "messages");
      expect(body.stop_sequences).toEqual(["\n", "END"]);
    });

    it("does not override client-provided stop_sequences for messages", () => {
      const body: Record<string, unknown> = { stop_sequences: ["STOP"] };
      injectModelParameters(body, { stop: "\n" }, "messages");
      expect(body.stop_sequences).toEqual(["STOP"]);
    });

    it("does not inject stop for responses", () => {
      const body: Record<string, unknown> = {};
      injectModelParameters(body, { stop: "\n" }, "responses");
      expect(body.stop).toBeUndefined();
      expect(body.stop_sequences).toBeUndefined();
    });
  });
});
