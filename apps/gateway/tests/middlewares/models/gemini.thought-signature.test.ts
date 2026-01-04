import { describe, expect, test } from "bun:test";

import { Gemini3ProPreviewAdapter } from "~gateway/middlewares/models/gemini";
import type { ModelAdapter } from "~gateway/middlewares/models/model";

describe("Gemini Adapter transformPrompt", () => {
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
                thoughtSignature: "context_engineering_is_the_way_to_go",
              },
            },
          ],
        },
      ],
    },
    {
      name: "does NOT inject when thoughtSignature is present",
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
                thoughtSignature: "existing_signature",
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
                thoughtSignature: "existing_signature",
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
                thoughtSignature: "context_engineering_is_the_way_to_go",
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
                thoughtSignature: "context_engineering_is_the_way_to_go",
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
