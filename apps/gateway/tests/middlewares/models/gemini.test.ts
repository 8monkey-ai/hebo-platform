import { describe, expect, test } from "bun:test";

import {
  Gemini3FlashPreviewAdapter,
  Gemini3ProPreviewAdapter,
} from "~gateway/middlewares/models/gemini";
import type { ModelAdapter } from "~gateway/middlewares/models/model";

import type { ProviderOptions } from "@ai-sdk/provider-utils";

describe("Gemini Adapter transformOptions", () => {
  type TestCase = {
    name: string;
    model: ModelAdapter;
    input: ProviderOptions;
    expected: ProviderOptions;
    shouldThrow?: boolean;
  };

  const gemini3ProAdapter = new Gemini3ProPreviewAdapter();
  const gemini3FlashAdapter = new Gemini3FlashPreviewAdapter();

  const testCases: TestCase[] = [
    // --- Gemini 3 Pro Scenarios ---
    {
      name: "Gemini 3 Pro: reasoning enabled (boolean) defaults to 8192 budget",
      model: gemini3ProAdapter,
      input: {
        reasoning: {
          enabled: true,
        },
      },
      expected: {
        thinkingConfig: {
          includeThoughts: true,
          thinkingLevel: "high",
        },
      },
    },
    {
      name: "Gemini 3 Pro: reasoning disabled with none effort",
      model: gemini3ProAdapter,
      input: {
        reasoning: {
          effort: "none",
        },
      },
      expected: {},
    },
    {
      name: "Gemini 3 Pro: exclude thoughts",
      model: gemini3ProAdapter,
      input: {
        reasoning: {
          enabled: true,
          exclude: true,
        },
      },
      expected: {
        thinkingConfig: {
          includeThoughts: false,
          thinkingLevel: "high",
        },
      },
    },
    {
      name: "Gemini 3 Pro: low effort -> LOW",
      model: gemini3ProAdapter,
      input: {
        reasoning: {
          effort: "low",
        },
      },
      expected: {
        thinkingConfig: {
          includeThoughts: true,
          thinkingLevel: "low",
        },
      },
    },
    {
      name: "Gemini 3 Pro: medium effort -> HIGH",
      model: gemini3ProAdapter,
      input: {
        reasoning: {
          effort: "medium",
        },
      },
      expected: {
        thinkingConfig: {
          includeThoughts: true,
          thinkingLevel: "high",
        },
      },
    },
    {
      name: "Gemini 3 Pro: minimal effort -> LOW",
      model: gemini3ProAdapter,
      input: {
        reasoning: {
          effort: "minimal",
        },
      },
      expected: {
        thinkingConfig: {
          includeThoughts: true,
          thinkingLevel: "low",
        },
      },
    },
    {
      name: "Gemini 3 Pro: high effort -> HIGH",
      model: gemini3ProAdapter,
      input: {
        reasoning: {
          effort: "high",
        },
      },
      expected: {
        thinkingConfig: {
          includeThoughts: true,
          thinkingLevel: "high",
        },
      },
    },
    {
      name: "Gemini 3 Pro: xhigh effort -> HIGH",
      model: gemini3ProAdapter,
      input: {
        reasoning: {
          effort: "xhigh",
        },
      },
      expected: {
        thinkingConfig: {
          includeThoughts: true,
          thinkingLevel: "high",
        },
      },
    },

    // --- Gemini 3 Flash Scenarios ---
    {
      name: "Gemini 3 Flash: low effort -> LOW",
      model: gemini3FlashAdapter,
      input: {
        reasoning: {
          effort: "low",
        },
      },
      expected: {
        thinkingConfig: {
          includeThoughts: true,
          thinkingLevel: "low",
        },
      },
    },
    {
      name: "Gemini 3 Flash: medium effort -> MEDIUM",
      model: gemini3FlashAdapter,
      input: {
        reasoning: {
          effort: "medium",
        },
      },
      expected: {
        thinkingConfig: {
          includeThoughts: true,
          thinkingLevel: "medium",
        },
      },
    },
    {
      name: "Gemini 3 Flash: high effort -> HIGH",
      model: gemini3FlashAdapter,
      input: {
        reasoning: {
          effort: "high",
        },
      },
      expected: {
        thinkingConfig: {
          includeThoughts: true,
          thinkingLevel: "high",
        },
      },
    },
    {
      name: "Gemini 3 Flash: minimal effort -> MINIMAL",
      model: gemini3FlashAdapter,
      input: {
        reasoning: {
          effort: "minimal",
        },
      },
      expected: {
        thinkingConfig: {
          includeThoughts: true,
          thinkingLevel: "minimal",
        },
      },
    },
    {
      name: "Gemini 3 Flash: xhigh effort -> HIGH",
      model: gemini3FlashAdapter,
      input: {
        reasoning: {
          effort: "xhigh",
        },
      },
      expected: {
        thinkingConfig: {
          includeThoughts: true,
          thinkingLevel: "high",
        },
      },
    },
    {
      name: "Gemini 3 Flash: default effort -> MEDIUM",
      model: gemini3FlashAdapter,
      input: {
        reasoning: {
          enabled: true,
        },
      },
      expected: {
        thinkingConfig: {
          includeThoughts: true,
          thinkingLevel: "medium",
        },
      },
    },
    {
      name: "Gemini 3 Pro: throws error if max_tokens is provided in reasoning",
      model: gemini3ProAdapter,
      input: {
        reasoning: {
          max_tokens: 100,
        },
      },
      shouldThrow: true,
      expected: {
        reasoning: {
          max_tokens: 100,
        },
      },
    },
    {
      name: "Gemini 3 Flash: throws error if max_tokens is provided in reasoning",
      model: gemini3FlashAdapter,
      input: {
        reasoning: {
          max_tokens: 100,
        },
      },
      shouldThrow: true,
      expected: {
        reasoning: {
          max_tokens: 100,
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
