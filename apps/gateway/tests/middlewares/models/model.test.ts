import { describe, expect, test } from "bun:test";

import { Gemini25FlashPreviewAdapter } from "~gateway/middlewares/models/gemini";
import { GptOss120bAdapter } from "~gateway/middlewares/models/gpt";
import type { ModelAdapter } from "~gateway/middlewares/models/model";

import type { ProviderOptions } from "@ai-sdk/provider-utils";

describe("Model Adapter transformOptions", () => {
  type TestCase = {
    name: string;
    model: ModelAdapter;
    input: ProviderOptions | undefined;
    expected: ProviderOptions | Record<string, any>;
    shouldThrow?: boolean;
  };

  const gptAdapter = new GptOss120bAdapter();
  const geminiAdapter = new Gemini25FlashPreviewAdapter();

  const testCases: TestCase[] = [
    // --- GPT Scenarios ---
    {
      name: "GPT: no options provided",
      model: gptAdapter,
      input: undefined,
      expected: {
        "openai-compatible": {},
      },
    },
    {
      name: "GPT: basic options (no reasoning)",
      model: gptAdapter,
      input: {
        "openai-compatible": {
          otherParam: 123,
        },
      },
      expected: {
        "openai-compatible": {},
      },
    },
    {
      name: "GPT: reasoning enabled with effort",
      model: gptAdapter,
      input: {
        "openai-compatible": {
          reasoning: {
            effort: "high",
          },
        },
      },
      expected: {
        "openai-compatible": {
          reasoningEffort: "high",
        },
      },
    },
    {
      name: "GPT: reasoning enabled (boolean) defaults to medium",
      model: gptAdapter,
      input: {
        "openai-compatible": {
          reasoning: {
            enabled: true,
          },
        },
      },
      expected: {
        "openai-compatible": {
          reasoningEffort: "medium",
        },
      },
    },
    {
      name: "GPT: throws on max_tokens in reasoning",
      model: gptAdapter,
      input: {
        "openai-compatible": {
          reasoning: {
            enabled: true,
            max_tokens: 1000,
          },
        },
      },
      expected: {},
      shouldThrow: true,
    },

    // --- Gemini Scenarios ---
    {
      name: "Gemini: no options provided",
      model: geminiAdapter,
      input: undefined,
      expected: {
        "openai-compatible": {},
      },
    },
    {
      name: "Gemini: reasoning enabled (boolean) defaults to 8192 budget",
      model: geminiAdapter,
      input: {
        "openai-compatible": {
          reasoning: {
            enabled: true,
          },
        },
      },
      expected: {
        "openai-compatible": {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: 8192,
          },
        },
      },
    },
    {
      name: "Gemini: reasoning with low effort",
      model: geminiAdapter,
      input: {
        "openai-compatible": {
          reasoning: {
            effort: "low",
          },
        },
      },
      expected: {
        "openai-compatible": {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: 1024,
          },
        },
      },
    },
    {
      name: "Gemini: reasoning with high effort",
      model: geminiAdapter,
      input: {
        "openai-compatible": {
          reasoning: {
            effort: "high",
          },
        },
      },
      expected: {
        "openai-compatible": {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: 24_576,
          },
        },
      },
    },
    {
      name: "Gemini: reasoning with specific max_tokens",
      model: geminiAdapter,
      input: {
        "openai-compatible": {
          reasoning: {
            max_tokens: 5000,
          },
        },
      },
      expected: {
        "openai-compatible": {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: 5000,
          },
        },
      },
    },
    {
      name: "Gemini: exclude thoughts",
      model: geminiAdapter,
      input: {
        "openai-compatible": {
          reasoning: {
            enabled: true,
            exclude: true,
          },
        },
      },
      expected: {
        "openai-compatible": {
          thinkingConfig: {
            includeThoughts: false,
            thinkingBudget: 8192,
          },
        },
      },
    },
  ];

  for (const { name, model, input, expected, shouldThrow } of testCases) {
    test(name, () => {
      if (shouldThrow) {
        expect(() => model.transformOptions(input)).toThrow();
      } else {
        const result = model.transformOptions(input);
        expect(result).toEqual(expected);
      }
    });
  }
});
