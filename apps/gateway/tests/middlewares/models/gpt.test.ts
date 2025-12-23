import { describe, expect, test } from "bun:test";

import { GptOss120bAdapter } from "~gateway/middlewares/models/gpt";
import type { ModelAdapter } from "~gateway/middlewares/models/model";

import type { ProviderOptions } from "@ai-sdk/provider-utils";

describe("GPT Adapter transformOptions", () => {
  type TestCase = {
    name: string;
    model: ModelAdapter;
    input: ProviderOptions | undefined;
    expected: ProviderOptions | Record<string, any>;
    shouldThrow?: boolean;
  };

  const gptAdapter = new GptOss120bAdapter();

  const testCases: TestCase[] = [
    // --- GPT Scenarios ---
    {
      name: "GPT: no options provided",
      model: gptAdapter,
      input: undefined,
      expected: {},
    },
    {
      name: "GPT: non openai-compatible options provided",
      model: gptAdapter,
      input: { abc: { key: "value" } },
      expected: { abc: { key: "value" } },
    },
    {
      name: "GPT: basic options (no reasoning)",
      model: gptAdapter,
      input: {
        openaiCompatible: {
          otherParam: 123,
        },
      },
      expected: {
        openaiCompatible: {
          otherParam: 123,
        },
      },
    },
    {
      name: "GPT: reasoning enabled with effort",
      model: gptAdapter,
      input: {
        openaiCompatible: {
          reasoning: {
            effort: "high",
          },
        },
      },
      expected: {
        openaiCompatible: {
          reasoning: {
            effort: "high",
          },
        },
        modelConfig: {
          reasoningEffort: "high",
        },
      },
    },
    {
      name: "GPT: reasoning enabled (boolean) defaults to medium",
      model: gptAdapter,
      input: {
        openaiCompatible: {
          reasoning: {
            enabled: true,
          },
        },
      },
      expected: {
        openaiCompatible: {
          reasoning: {
            enabled: true,
          },
        },
        modelConfig: {
          reasoningEffort: "medium",
        },
      },
    },
    {
      name: "GPT: throws on max_tokens in reasoning",
      model: gptAdapter,
      input: {
        openaiCompatible: {
          reasoning: {
            enabled: true,
            max_tokens: 1000,
          },
        },
      },
      expected: {
        openaiCompatible: {
          reasoning: {
            enabled: true,
            max_tokens: 1000,
          },
        },
      },
      shouldThrow: true,
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
