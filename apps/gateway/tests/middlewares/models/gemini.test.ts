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
    input: ProviderOptions | undefined;
    expected: ProviderOptions | Record<string, any>;
    shouldThrow?: boolean;
  };

  const gemini3ProAdapter = new Gemini3ProPreviewAdapter();
  const gemini3FlashAdapter = new Gemini3FlashPreviewAdapter();

  const testCases: TestCase[] = [
    // --- Gemini 3 Pro Scenarios ---
    {
      name: "Gemini 3 Pro: no options provided",
      model: gemini3ProAdapter,
      input: undefined,
      expected: {},
    },
    {
      name: "Gemini 3 Pro: reasoning enabled (boolean) defaults to 8192 budget",
      model: gemini3ProAdapter,
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
          thinkingConfig: {
            includeThoughts: true,
            thinkingLevel: "high",
          },
        },
      },
    },
    {
      name: "Gemini 3 Pro: reasoning with low effort",
      model: gemini3ProAdapter,
      input: {
        openaiCompatible: {
          reasoning: {
            effort: "low",
          },
        },
      },
      expected: {
        openaiCompatible: {
          reasoning: {
            effort: "low",
          },
        },
        modelConfig: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingLevel: "low",
          },
        },
      },
    },
    {
      name: "Gemini 3 Pro: reasoning with high effort",
      model: gemini3ProAdapter,
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
          thinkingConfig: {
            includeThoughts: true,
            thinkingLevel: "high",
          },
        },
      },
    },
    {
      name: "Gemini 3 Pro: reasoning with minimal effort",
      model: gemini3ProAdapter,
      input: {
        openaiCompatible: {
          reasoning: {
            effort: "minimal",
          },
        },
      },
      expected: {
        openaiCompatible: {
          reasoning: {
            effort: "minimal",
          },
        },
        modelConfig: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingLevel: "low",
          },
        },
      },
    },
    {
      name: "Gemini 3 Pro: reasoning with xhigh effort",
      model: gemini3ProAdapter,
      input: {
        openaiCompatible: {
          reasoning: {
            effort: "xhigh",
          },
        },
      },
      expected: {
        openaiCompatible: {
          reasoning: {
            effort: "xhigh",
          },
        },
        modelConfig: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingLevel: "high",
          },
        },
      },
    },
    {
      name: "Gemini 3 Pro: reasoning disabled with none effort",
      model: gemini3ProAdapter,
      input: {
        openaiCompatible: {
          reasoning: {
            effort: "none",
          },
        },
      },
      expected: {
        openaiCompatible: {
          reasoning: {
            effort: "none",
          },
        },
      },
    },
    {
      name: "Gemini 3 Pro: exclude thoughts",
      model: gemini3ProAdapter,
      input: {
        openaiCompatible: {
          reasoning: {
            enabled: true,
            exclude: true,
          },
        },
      },
      expected: {
        openaiCompatible: {
          reasoning: {
            enabled: true,
            exclude: true,
          },
        },
        modelConfig: {
          thinkingConfig: {
            includeThoughts: false,
            thinkingLevel: "high",
          },
        },
      },
    },

    // --- Gemini 3 Pro Scenarios ---
    {
      name: "Gemini 3 Pro: low effort -> LOW",
      model: gemini3ProAdapter,
      input: {
        openaiCompatible: {
          reasoning: {
            effort: "low",
          },
        },
      },
      expected: {
        openaiCompatible: {
          reasoning: {
            effort: "low",
          },
        },
        modelConfig: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingLevel: "low",
          },
        },
      },
    },
    {
      name: "Gemini 3 Pro: medium effort -> HIGH",
      model: gemini3ProAdapter,
      input: {
        openaiCompatible: {
          reasoning: {
            effort: "medium",
          },
        },
      },
      expected: {
        openaiCompatible: {
          reasoning: {
            effort: "medium",
          },
        },
        modelConfig: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingLevel: "high",
          },
        },
      },
    },
    {
      name: "Gemini 3 Pro: minimal effort -> LOW",
      model: gemini3ProAdapter,
      input: {
        openaiCompatible: {
          reasoning: {
            effort: "minimal",
          },
        },
      },
      expected: {
        openaiCompatible: {
          reasoning: {
            effort: "minimal",
          },
        },
        modelConfig: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingLevel: "low",
          },
        },
      },
    },
    {
      name: "Gemini 3 Pro: xhigh effort -> HIGH",
      model: gemini3ProAdapter,
      input: {
        openaiCompatible: {
          reasoning: {
            effort: "xhigh",
          },
        },
      },
      expected: {
        openaiCompatible: {
          reasoning: {
            effort: "xhigh",
          },
        },
        modelConfig: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingLevel: "high",
          },
        },
      },
    },

    // --- Gemini 3 Flash Scenarios ---
    {
      name: "Gemini 3 Flash: low effort -> LOW",
      model: gemini3FlashAdapter,
      input: {
        openaiCompatible: {
          reasoning: {
            effort: "low",
          },
        },
      },
      expected: {
        openaiCompatible: {
          reasoning: {
            effort: "low",
          },
        },
        modelConfig: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingLevel: "low",
          },
        },
      },
    },
    {
      name: "Gemini 3 Flash: medium effort -> MEDIUM",
      model: gemini3FlashAdapter,
      input: {
        openaiCompatible: {
          reasoning: {
            effort: "medium",
          },
        },
      },
      expected: {
        openaiCompatible: {
          reasoning: {
            effort: "medium",
          },
        },
        modelConfig: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingLevel: "medium",
          },
        },
      },
    },
    {
      name: "Gemini 3 Flash: high effort -> HIGH",
      model: gemini3FlashAdapter,
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
          thinkingConfig: {
            includeThoughts: true,
            thinkingLevel: "high",
          },
        },
      },
    },
    {
      name: "Gemini 3 Flash: minimal effort -> MINIMAL",
      model: gemini3FlashAdapter,
      input: {
        openaiCompatible: {
          reasoning: {
            effort: "minimal",
          },
        },
      },
      expected: {
        openaiCompatible: {
          reasoning: {
            effort: "minimal",
          },
        },
        modelConfig: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingLevel: "minimal",
          },
        },
      },
    },
    {
      name: "Gemini 3 Flash: xhigh effort -> HIGH",
      model: gemini3FlashAdapter,
      input: {
        openaiCompatible: {
          reasoning: {
            effort: "xhigh",
          },
        },
      },
      expected: {
        openaiCompatible: {
          reasoning: {
            effort: "xhigh",
          },
        },
        modelConfig: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingLevel: "high",
          },
        },
      },
    },
    {
      name: "Gemini 3 Flash: default effort -> MEDIUM",
      model: gemini3FlashAdapter,
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
          thinkingConfig: {
            includeThoughts: true,
            thinkingLevel: "medium",
          },
        },
      },
    },
    {
      name: "Gemini 3 Pro: throws error if max_tokens is provided in reasoning",
      model: gemini3ProAdapter,
      input: {
        openaiCompatible: {
          reasoning: {
            max_tokens: 100,
          },
        },
      },
      shouldThrow: true,
      expected: {
        openaiCompatible: {
          reasoning: {
            max_tokens: 100,
          },
        },
      },
    },
    {
      name: "Gemini 3 Flash: throws error if max_tokens is provided in reasoning",
      model: gemini3FlashAdapter,
      input: {
        openaiCompatible: {
          reasoning: {
            max_tokens: 100,
          },
        },
      },
      shouldThrow: true,
      expected: {
        openaiCompatible: {
          reasoning: {
            max_tokens: 100,
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
