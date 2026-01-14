import { describe, expect, test } from "bun:test";

import type { ProviderAdapter } from "~gateway/middlewares/providers/provider";
import { VertexProviderAdapter } from "~gateway/middlewares/providers/vertex";

import type { ProviderOptions } from "@ai-sdk/provider-utils";

describe("VertexProviderAdapter transformOptions", () => {
  type TestCase = {
    name: string;
    provider: ProviderAdapter;
    input: ProviderOptions;
    expected: ProviderOptions;
  };

  const vertexProvider = new VertexProviderAdapter("gemini-2.5-pro");

  const testCases: TestCase[] = [
    {
      name: "Vertex: passes through transformed thinkingConfig",
      provider: vertexProvider,
      input: {
        thinkingConfig: {
          includeThoughts: true,
          thinkingBudget: 8192,
        },
      },
      expected: {
        thinkingConfig: {
          includeThoughts: true,
          thinkingBudget: 8192,
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
