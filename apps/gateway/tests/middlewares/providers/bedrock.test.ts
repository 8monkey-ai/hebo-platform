import { describe, expect, test } from "bun:test";

import { BedrockProviderAdapter } from "~gateway/middlewares/providers/bedrock";
import type { ProviderAdapter } from "~gateway/middlewares/providers/provider";

import type { ProviderOptions } from "@ai-sdk/provider-utils";

describe("BedrockProviderAdapter transformOptions", () => {
  type TestCase = {
    name: string;
    provider: ProviderAdapter;
    input: ProviderOptions;
    expected: ProviderOptions;
  };

  const bedrockProvider = new BedrockProviderAdapter(
    "anthropic.claude-3-sonnet-20240229-v1:0",
  );

  const testCases: TestCase[] = [
    {
      name: "Bedrock: converts transformed openai-compatible options to snake_case",
      provider: bedrockProvider,
      input: {
        reasoningEffort: "medium",
      },
      expected: {
        additionalModelRequestFields: {
          reasoning_effort: "medium",
        },
      },
    },
    {
      name: "Bedrock: converts deeply nested transformed openai-compatible options to snake_case",
      provider: bedrockProvider,
      input: {
        optionOne: "value1",
        nestedOption: {
          nestedOptionOne: "value2",
          anotherNestedOption: {
            deeplyNestedOption: "value3",
          },
        },
      },
      expected: {
        additionalModelRequestFields: {
          option_one: "value1",
          nested_option: {
            nested_option_one: "value2",
            another_nested_option: {
              deeply_nested_option: "value3",
            },
          },
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
