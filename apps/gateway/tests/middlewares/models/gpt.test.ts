import { describe, expect, test } from "bun:test";

import { GptOss120bAdapter } from "~gateway/middlewares/models/gpt";
import type { ModelAdapter } from "~gateway/middlewares/models/model";

import type { ProviderOptions } from "@ai-sdk/provider-utils";

describe("GPT Adapter transformOptions", () => {
  type TestCase = {
    name: string;
    model: ModelAdapter;
    input: ProviderOptions;
    expected: ProviderOptions;
    shouldThrow?: boolean;
  };

  const gptAdapter = new GptOss120bAdapter();

  const testCases: TestCase[] = [
    {
      name: "GPT: non openai-compatible options provided",
      model: gptAdapter,
      input: { abc: { key: "value" } },
      expected: {},
    },
    {
      name: "GPT: reasoning enabled with effort",
      model: gptAdapter,
      input: {
        reasoning: {
          effort: "high",
        },
      },
      expected: {
        reasoningEffort: "high",
      },
    },
    {
      name: "GPT: reasoning enabled (boolean) defaults to medium",
      model: gptAdapter,
      input: {
        reasoning: {
          enabled: true,
        },
      },
      expected: {
        reasoningEffort: "medium",
      },
    },
    {
      name: "GPT: throws on max_tokens in reasoning",
      model: gptAdapter,
      input: {
        reasoning: {
          enabled: true,
          max_tokens: 1000,
        },
      },
      shouldThrow: true,
      expected: {
        reasoning: {
          enabled: true,
          max_tokens: 1000,
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
