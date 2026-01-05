import { describe, expect, test } from "bun:test";

import type { ProviderAdapter } from "~gateway/middlewares/providers/provider";
import { VertexProviderAdapter } from "~gateway/middlewares/providers/vertex";

import type { LanguageModelV2Prompt } from "@ai-sdk/provider";
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

describe("VertexProviderAdapter transformPrompt", () => {
  type TestCase = {
    name: string;
    input: LanguageModelV2Prompt;
    expected: LanguageModelV2Prompt;
  };

  const vertexProvider = new VertexProviderAdapter("gemini-2.5-pro");
  const providerSlug = "google";

  const testCases: TestCase[] = [
    {
      name: "should transform message-level providerOptions with reasoningEffort",
      input: [
        {
          role: "user",
          content: [{ type: "text", text: "Hello" }],
          providerOptions: { reasoningEffort: "high" },
        },
      ],
      expected: [
        {
          role: "user",
          content: [{ type: "text", text: "Hello" }],
          providerOptions: {
            [providerSlug]: { reasoningEffort: "high" },
          },
        },
      ],
    },
    {
      name: "should transform content-part-level providerOptions with reasoningEffort",
      input: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Hello",
              providerOptions: { reasoningEffort: "high" },
            },
          ],
        },
      ],
      expected: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Hello",
              providerOptions: { [providerSlug]: { reasoningEffort: "high" } },
            },
          ],
        },
      ],
    },
    {
      name: "should transform both message-level and content-part-level providerOptions with reasoningEffort",
      input: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Hello",
              providerOptions: { reasoningEffort: "high" },
            },
          ],
          providerOptions: { reasoningEffort: "high" },
        },
      ],
      expected: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Hello",
              providerOptions: { [providerSlug]: { reasoningEffort: "high" } },
            },
          ],
          providerOptions: {
            [providerSlug]: { reasoningEffort: "high" },
          },
        },
      ],
    },
    {
      name: "should not modify prompt without providerOptions",
      input: [
        {
          role: "user",
          content: [{ type: "text", text: "Hello" }],
        },
      ],
      expected: [
        {
          role: "user",
          content: [{ type: "text", text: "Hello" }],
        },
      ],
    },
  ];

  for (const { name, input, expected } of testCases) {
    test(name, () => {
      const result = vertexProvider.transformPrompt(input);
      expect(result).toEqual(expected);
    });
  }
});
