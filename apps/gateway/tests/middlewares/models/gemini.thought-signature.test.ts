import { describe, expect, test } from "bun:test";

import { GeminiModelAdapter } from "~gateway/middlewares/models/gemini";

import type { LanguageModelV2Prompt } from "@ai-sdk/provider";

describe("Gemini Adapter thoughtSignature transformations", () => {
  const geminiAdapter = new (class extends GeminiModelAdapter {
    readonly id = "test-gemini-id";
    readonly name = "Test Gemini Model";
    readonly created = 1_234_567_890;
  })();

  describe("transformPrompt (Input)", () => {
    type TestCase = {
      name: string;
      input: LanguageModelV2Prompt;
      expected: LanguageModelV2Prompt;
    };

    const testCases: TestCase[] = [
      {
        name: "should convert thought_signature to thoughtSignature in message providerOptions",
        input: [
          {
            role: "user",
            content: [{ type: "text", text: "Hello" }],
          },
          {
            role: "assistant",
            content: [{ type: "text", text: "Hi there" }],
            providerOptions: {
              google: {
                thought_signature: "input_signature_123",
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
        name: "should convert thought_signature to thoughtSignature in content part providerOptions",
        input: [
          {
            role: "assistant",
            content: [
              {
                type: "text",
                text: "Thoughtful response",
                providerOptions: {
                  google: {
                    thought_signature: "content_signature_456",
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
        name: "should not modify prompt without google thought_signature",
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
      const transformedPrompt = geminiAdapter.transformPrompt(input);
      expect(transformedPrompt).toEqual(expected);
    });
  });

  describe("transformProviderMetadata (Output)", () => {
    type TestCase = {
      name: string;
      input: Record<string, any> | undefined;
      expected: Record<string, any> | undefined;
    };

    const testCases: TestCase[] = [
      {
        name: "should convert thoughtSignature to thought_signature in output providerMetadata",
        input: {
          google: {
            thoughtSignature: "output_signature_789",
          },
        },
        expected: {
          google: {
            thought_signature: "output_signature_789",
          },
        },
      },
      {
        name: "should not modify providerMetadata without google thoughtSignature",
        input: {
          otherProvider: {
            someField: "value",
          },
        },
        expected: {
          otherProvider: {
            someField: "value",
          },
        },
      },
      {
        name: "should not modify undefined providerMetadata",
        input: undefined,
        expected: undefined,
      },
    ];

    test.each(testCases)("$name", ({ input, expected }) => {
      const transformedMetadata =
        geminiAdapter.transformProviderMetadata(input);
      expect(transformedMetadata).toEqual(expected);
    });
  });
});
