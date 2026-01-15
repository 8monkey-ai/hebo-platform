import { describe, expect, test } from "bun:test";

import { VertexProviderAdapter } from "~gateway/middlewares/providers/vertex";

import type { LanguageModelV2Prompt } from "@ai-sdk/provider";

describe("Vertex Adapter - Pass-through transformations", () => {
  const vertexAdapter = new VertexProviderAdapter(
    "google/gemini-3-pro-preview",
  );

  describe("transformPrompt (Input)", () => {
    type TestCase = {
      name: string;
      input: LanguageModelV2Prompt;
      expected: LanguageModelV2Prompt;
    };

    const testCases: TestCase[] = [
      {
        name: "should convert extra_content (snake_case) with nested google to top-level camelCase in message providerOptions",
        input: [
          {
            role: "user",
            content: [{ type: "text", text: "Hello" }],
          },
          {
            role: "assistant",
            content: [{ type: "text", text: "Hi there" }],
            providerOptions: {
              extra_content: {
                google: {
                  thought_signature: "input_signature_123",
                },
              },
            },
          },
        ],
        expected: [
          {
            role: "user",
            content: [{ type: "text", text: "Hello" }],
          },
          {
            role: "assistant",
            content: [{ type: "text", text: "Hi there" }],
            providerOptions: {
              google: {
                thoughtSignature: "input_signature_123",
              },
            },
          },
        ],
      },
      {
        name: "should convert extra_content (snake_case) with nested google to top-level camelCase in content part providerOptions",
        input: [
          {
            role: "assistant",
            content: [
              {
                type: "text",
                text: "Thoughtful response",
                providerOptions: {
                  extra_content: {
                    google: {
                      thought_signature: "content_signature_456",
                    },
                  },
                },
              },
            ],
          },
        ],
        expected: [
          {
            role: "assistant",
            content: [
              {
                type: "text",
                text: "Thoughtful response",
                providerOptions: {
                  google: {
                    thoughtSignature: "content_signature_456",
                  },
                },
              },
            ],
          },
        ],
      },
      {
        name: "should not modify prompt without extra_content",
        input: [
          {
            role: "user",
            content: [{ type: "text", text: "No signature here" }],
            providerOptions: {
              other: { stuff: "abc" },
            },
          },
        ],
        expected: [
          {
            role: "user",
            content: [{ type: "text", text: "No signature here" }],
            providerOptions: {
              other: { stuff: "abc" },
            },
          },
        ],
      },
      {
        name: "should not modify prompt without any providerOptions",
        input: [
          {
            role: "user",
            content: [{ type: "text", text: "Simple text" }],
          },
        ],
        expected: [
          {
            role: "user",
            content: [{ type: "text", text: "Simple text" }],
          },
        ],
      },
    ];

    test.each(testCases)("$name", ({ input, expected }) => {
      const transformedPrompt = vertexAdapter.transformPrompt(input);
      expect(transformedPrompt).toEqual(expected);
    });
  });

  describe("transformResult (Output)", () => {
    type TestCase = {
      name: string;
      input: any; // Raw result from AI SDK
      expectedMetadata: Record<string, any> | undefined; // The providerMetadata part of the final result
    };

    const testCases: TestCase[] = [
      {
        name: "should convert providerMetadata (camelCase) to snake_case and nest in extra_content",
        input: {
          providerMetadata: {
            google: {
              thoughtSignature: "output_signature_789",
              someOtherCamelField: "value",
            },
            someOtherTopLevelField: "topValue",
          },
        },
        expectedMetadata: {
          extra_content: {
            google: {
              thought_signature: "output_signature_789",
              some_other_camel_field: "value",
            },
            some_other_top_level_field: "topValue",
          },
        },
      },
      {
        name: "should handle nested objects in providerMetadata",
        input: {
          providerMetadata: {
            google: {
              nestedObject: {
                deeplyNestedKey: "deepValue",
              },
            },
          },
        },
        expectedMetadata: {
          extra_content: {
            google: {
              nested_object: {
                deeply_nested_key: "deepValue",
              },
            },
          },
        },
      },
      {
        name: "should handle undefined providerMetadata",
        input: {},
        expectedMetadata: undefined,
      },
      {
        name: "should handle null providerMetadata",
        // eslint-disable-next-line unicorn/no-null
        input: { providerMetadata: null },
        // eslint-disable-next-line unicorn/no-null
        expectedMetadata: null,
      },
    ];

    test.each(testCases)("$name", ({ input, expectedMetadata }) => {
      const result = vertexAdapter.transformResult(input);
      expect(result.providerMetadata).toEqual(expectedMetadata);
    });
  });
});
