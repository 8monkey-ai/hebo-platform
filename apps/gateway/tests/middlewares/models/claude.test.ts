import { describe, expect, test } from "bun:test";

import { ClaudeOpus45Adapter } from "~gateway/middlewares/models/claude";
import type { ModelAdapter } from "~gateway/middlewares/models/model";

import type { ProviderOptions } from "@ai-sdk/provider-utils";

describe("Claude Adapter transformOptions", () => {
  type TestCase = {
    name: string;
    model: ModelAdapter;
    input: ProviderOptions | undefined;
    expected: ProviderOptions | Record<string, any>;
  };

  const claudeAdapter = new ClaudeOpus45Adapter();

  const testCases: TestCase[] = [
    {
      name: "Claude: no options provided",
      model: claudeAdapter,
      input: undefined,
      expected: {},
    },
    {
      name: "Claude: basic options (no reasoning)",
      model: claudeAdapter,
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
      name: "Claude: reasoning enabled (boolean) defaults to medium (50%)",
      model: claudeAdapter,
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
          thinking: {
            type: "enabled",
            budgetTokens: 32_000, // 50% of 64000
          },
        },
      },
    },
    {
      name: "Claude: reasoning with minimal effort (10%)",
      model: claudeAdapter,
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
          thinking: {
            type: "enabled",
            budgetTokens: 6400, // 10% of 64000
          },
        },
      },
    },
    {
      name: "Claude: reasoning with low effort (20%)",
      model: claudeAdapter,
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
          thinking: {
            type: "enabled",
            budgetTokens: 12_800, // 20% of 64000
          },
        },
      },
    },
    {
      name: "Claude: reasoning with medium effort (50%)",
      model: claudeAdapter,
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
          thinking: {
            type: "enabled",
            budgetTokens: 32_000, // 50% of 64000
          },
        },
      },
    },
    {
      name: "Claude: reasoning with high effort (80%)",
      model: claudeAdapter,
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
          thinking: {
            type: "enabled",
            budgetTokens: 51_200, // 80% of 64000
          },
        },
      },
    },
    {
      name: "Claude: reasoning with xhigh effort (95%)",
      model: claudeAdapter,
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
          thinking: {
            type: "enabled",
            budgetTokens: 60_800, // 95% of 64000
          },
        },
      },
    },
    {
      name: "Claude: reasoning with specific max_tokens",
      model: claudeAdapter,
      input: {
        openaiCompatible: {
          reasoning: {
            max_tokens: 15_000,
          },
        },
      },
      expected: {
        openaiCompatible: {
          reasoning: {
            max_tokens: 15_000,
          },
        },
        modelConfig: {
          thinking: {
            type: "enabled",
            budgetTokens: 15_000,
          },
        },
      },
    },
    {
      name: "Claude: reasoning disabled with none effort",
      model: claudeAdapter,
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
      name: "Claude: ensures budget is at least 1024",
      model: claudeAdapter,
      input: {
        openaiCompatible: {
          reasoning: {
            max_tokens: 500, // Explicitly low
          },
        },
      },
      expected: {
        openaiCompatible: {
          reasoning: {
            max_tokens: 500, // Explicitly low
          },
        },
        modelConfig: {
          thinking: {
            type: "enabled",
            budgetTokens: 1024,
          },
        },
      },
    },
  ];

  for (const { name, model, input, expected } of testCases) {
    test(name, () => {
      const result = model.transformOptions(input);
      expect(result).toEqual(expected);
    });
  }
});
