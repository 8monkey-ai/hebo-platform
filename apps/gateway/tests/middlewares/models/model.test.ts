import { describe, expect, test } from "bun:test";

import {
  Gemini25FlashPreviewAdapter,
  Gemini3FlashPreviewAdapter,
  Gemini3ProPreviewAdapter,
} from "~gateway/middlewares/models/gemini";
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
  const gemini3ProAdapter = new Gemini3ProPreviewAdapter();
  const gemini3FlashAdapter = new Gemini3FlashPreviewAdapter();

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
        openaiCompatible: {},
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
      expected: {},
      shouldThrow: true,
    },

    // --- Gemini Scenarios ---
    {
      name: "Gemini: no options provided",
      model: geminiAdapter,
      input: undefined,
      expected: {},
    },
    {
      name: "Gemini: reasoning enabled (boolean) defaults to 8192 budget",
      model: geminiAdapter,
      input: {
        openaiCompatible: {
          reasoning: {
            enabled: true,
          },
        },
      },
      expected: {
        openaiCompatible: {
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
        openaiCompatible: {
          reasoning: {
            effort: "low",
          },
        },
      },
      expected: {
        openaiCompatible: {
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
        openaiCompatible: {
          reasoning: {
            effort: "high",
          },
        },
      },
      expected: {
        openaiCompatible: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: 24_576,
          },
        },
      },
    },
    {
      name: "Gemini: reasoning with minimal effort",
      model: geminiAdapter,
      input: {
        openaiCompatible: {
          reasoning: {
            effort: "minimal",
          },
        },
      },
      expected: {
        openaiCompatible: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: 1024,
          },
        },
      },
    },
    {
      name: "Gemini: reasoning with xhigh effort",
      model: geminiAdapter,
      input: {
        openaiCompatible: {
          reasoning: {
            effort: "xhigh",
          },
        },
      },
      expected: {
        openaiCompatible: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingBudget: 32_768,
          },
        },
      },
    },
    {
      name: "Gemini: reasoning disabled with none effort",
      model: geminiAdapter,
      input: {
        openaiCompatible: {
          reasoning: {
            effort: "none",
          },
        },
      },
      expected: {
        openaiCompatible: {},
      },
    },
    {
      name: "Gemini: reasoning with specific max_tokens",
      model: geminiAdapter,
      input: {
        openaiCompatible: {
          reasoning: {
            max_tokens: 5000,
          },
        },
      },
      expected: {
        openaiCompatible: {
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
        openaiCompatible: {
          reasoning: {
            enabled: true,
            exclude: true,
          },
        },
      },
      expected: {
        openaiCompatible: {
          thinkingConfig: {
            includeThoughts: false,
            thinkingBudget: 8192,
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
          thinkingConfig: {
            includeThoughts: true,
            thinkingLevel: "medium",
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

describe("Model Adapter transformPrompt", () => {
  type PromptTestCase = {
    name: string;
    model: ModelAdapter;
    inputPrompt: any;
    expectedPrompt: any;
  };

  const gemini3ProAdapter = new Gemini3ProPreviewAdapter();

  const promptTestCases: PromptTestCase[] = [
    {
      name: "injects google thoughtSignature when missing",
      model: gemini3ProAdapter,
      inputPrompt: [
        {
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: "call_123",
              toolName: "get_weather",
              args: { location: "San Francisco" },
            },
          ],
        },
      ],
      expectedPrompt: [
        {
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: "call_123",
              toolName: "get_weather",
              args: { location: "San Francisco" },
              providerOptions: {
                google: {
                  thoughtSignature: "context_engineering_is_the_way_to_go",
                },
              },
            },
          ],
        },
      ],
    },
    {
      name: "does NOT inject when openaiCompatible.thoughtSignature is present",
      model: gemini3ProAdapter,
      inputPrompt: [
        {
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: "call_456",
              toolName: "get_time",
              args: { timezone: "UTC" },
              providerOptions: {
                openaiCompatible: {
                  thoughtSignature: "existing_signature",
                },
              },
            },
          ],
        },
      ],
      expectedPrompt: [
        {
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: "call_456",
              toolName: "get_time",
              args: { timezone: "UTC" },
              providerOptions: {
                openaiCompatible: {
                  thoughtSignature: "existing_signature",
                },
              },
            },
          ],
        },
      ],
    },
    {
      name: "injects thoughtSignature for the first tool call of each message",
      model: gemini3ProAdapter,
      inputPrompt: [
        {
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: "call_1",
              toolName: "t1",
            },
            {
              type: "tool-call",
              toolCallId: "call_2",
              toolName: "t2",
            },
          ],
        },
        {
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: "call_3",
              toolName: "t3",
            },
          ],
        },
      ],
      expectedPrompt: [
        {
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: "call_1",
              toolName: "t1",
              providerOptions: {
                google: {
                  thoughtSignature: "context_engineering_is_the_way_to_go",
                },
              },
            },
            {
              type: "tool-call",
              toolCallId: "call_2",
              toolName: "t2",
            },
          ],
        },
        {
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: "call_3",
              toolName: "t3",
              providerOptions: {
                google: {
                  thoughtSignature: "context_engineering_is_the_way_to_go",
                },
              },
            },
          ],
        },
      ],
    },
  ];

  for (const { name, model, inputPrompt, expectedPrompt } of promptTestCases) {
    test(name, () => {
      const result = model.transformPrompt(inputPrompt);
      expect(result).toEqual(expectedPrompt);
    });
  }
});
