import { describe, expect, test } from "bun:test";

import { GroqProviderAdapter } from "~gateway/middlewares/providers/groq";
import type { ProviderAdapter } from "~gateway/middlewares/providers/provider";

import type { ProviderOptions } from "@ai-sdk/provider-utils";

describe("GroqProviderAdapter transformOptions", () => {
  type TestCase = {
    name: string;
    provider: ProviderAdapter;
    input: ProviderOptions;
    expected: ProviderOptions;
  };

  const groqProvider = new GroqProviderAdapter("openai/gpt-oss-120b");

  const testCases: TestCase[] = [
    {
      name: "Groq: passes through transformed reasoningEffort",
      provider: groqProvider,
      input: {
        reasoningEffort: "medium",
      },
      expected: {
        reasoningEffort: "medium",
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
