import { describe, expect, test } from "bun:test";

import { BedrockProviderAdapter } from "~gateway/middlewares/providers/bedrock";
import { GroqProviderAdapter } from "~gateway/middlewares/providers/groq";
import type { ProviderAdapter } from "~gateway/middlewares/providers/provider";
import { VertexProviderAdapter } from "~gateway/middlewares/providers/vertex";

import type { ProviderOptions } from "@ai-sdk/provider-utils";

describe("Provider Adapter transformOptions", () => {
  type TestCase = {
    name: string;
    provider: ProviderAdapter;
    input: ProviderOptions | undefined;
    expected: ProviderOptions;
  };

  const groqProvider = new GroqProviderAdapter("openai/gpt-oss-120b");
  const bedrockProvider = new BedrockProviderAdapter(
    "anthropic.claude-3-sonnet-20240229-v1:0",
  );
  const vertexProvider = new VertexProviderAdapter("gemini-2.5-pro");

  const testCases: TestCase[] = [
    // --- Groq Scenarios (Base Implementation) ---
    {
      name: "Groq: no options provided",
      provider: groqProvider,
      input: undefined,
      expected: {},
    },
    {
      name: "Groq: passes through transformed reasoningEffort",
      provider: groqProvider,
      input: {
        "openai-compatible": {
          reasoningEffort: "medium",
        },
      } as any,
      expected: {
        groq: {
          reasoningEffort: "medium",
        },
      },
    },
    {
      name: "Groq: preserves other provider options",
      provider: groqProvider,
      input: {
        "other-provider": {
          key: "value",
        },
        "openai-compatible": {
          reasoningEffort: "high",
        },
      } as any,
      expected: {
        "other-provider": {
          key: "value",
        },
        groq: {
          reasoningEffort: "high",
        },
      },
    },

    // --- Bedrock Scenarios ---
    {
      name: "Bedrock: no options returns empty object",
      provider: bedrockProvider,
      input: undefined,
      expected: {},
    },
    {
      name: "Bedrock: converts transformed openai-compatible options to snake_case",
      provider: bedrockProvider,
      input: {
        "openai-compatible": {
          maxTokens: 512,
          stopSequences: ["\nUser:", "stop"],
          customBedrockOption: "value",
        },
      } as any,
      expected: {
        bedrock: {
          additionalModelRequestFields: {
            max_tokens: 512,
            stop_sequences: ["\nUser:", "stop"],
            custom_bedrock_option: "value",
          },
        },
      },
    },

    // --- Vertex Scenarios ---
    {
      name: "Vertex: no options provided",
      provider: vertexProvider,
      input: undefined,
      expected: {},
    },
    {
      name: "Vertex: passes through transformed thinkingConfig",
      provider: vertexProvider,
      input: {
        "openai-compatible": {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: 8192,
          },
        },
      },
      expected: {
        google: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: 8192,
          },
        },
      },
    },
    {
      name: "Vertex: passes through generic safetySettings from openai-compatible",
      provider: vertexProvider,
      input: {
        "openai-compatible": {
          safetySettings: [
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_LOW_AND_ABOVE",
            },
          ],
        },
      } as any,
      expected: {
        google: {
          safetySettings: [
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_LOW_AND_ABOVE",
            },
          ],
        },
      },
    },
  ];

  for (const { name, provider, input, expected } of testCases) {
    test(name, () => {
      const result = provider.transformOptions(input);
      expect(result).toEqual(expected);
    });
  }
});
