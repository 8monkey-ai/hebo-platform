import { describe, expect, test } from "bun:test";

import { ClaudeOpus45Adapter } from "~gateway/middlewares/models/claude";
import type { ModelAdapter } from "~gateway/middlewares/models/model";

describe("Claude Adapter transformPrompt", () => {
  type PromptTestCase = {
    name: string;
    model: ModelAdapter;
    inputPrompt: any;
    expectedPrompt: any;
  };

  const claudeOpus45Adapter = new ClaudeOpus45Adapter();

  const promptTestCases: PromptTestCase[] = [
    {
      name: "does NOT inject when reasoning_content or thought_signature is missing",
      model: claudeOpus45Adapter,
      inputPrompt: [
        {
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: "call_456",
              toolName: "get_time",
              args: {
                timezone: "UTC",
              },
              providerOptions: {
                openaiCompatible: {
                  reasoning_content: "Thought: I need to call the time tool.\n",
                  // thought_signature is missing
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
              args: {
                timezone: "UTC",
              },
              providerOptions: {
                openaiCompatible: {
                  reasoning_content: "Thought: I need to call the time tool.\n",
                },
              },
            },
          ],
        },
      ],
    },
    {
      name: "injects reasoning before the first tool call of each message",
      model: claudeOpus45Adapter,
      inputPrompt: [
        {
          role: "assistant",
          content: [
            {
              type: "text",
              text: "Here is some introductory text.",
            },
            {
              type: "tool-call",
              toolCallId: "call_1",
              toolName: "t1",
              providerOptions: {
                openaiCompatible: {
                  reasoning_content: "Thought: Calling t1.\n",
                  thought_signature: "sig1",
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
                openaiCompatible: {
                  reasoning_content: "Thought: Calling t3.\n",
                  thought_signature: "sig3",
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
              type: "text",
              text: "Here is some introductory text.",
            },
            {
              type: "reasoning",
              text: "Thought: Calling t1.\n",
              providerOptions: {
                bedrock: {
                  signature: "sig1",
                },
              },
            },
            {
              type: "tool-call",
              toolCallId: "call_1",
              toolName: "t1",
              providerOptions: {
                openaiCompatible: {
                  reasoning_content: "Thought: Calling t1.\n",
                  thought_signature: "sig1",
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
              type: "reasoning",
              text: "Thought: Calling t3.\n",
              providerOptions: {
                bedrock: {
                  signature: "sig3",
                },
              },
            },
            {
              type: "tool-call",
              toolCallId: "call_3",
              toolName: "t3",
              providerOptions: {
                openaiCompatible: {
                  reasoning_content: "Thought: Calling t3.\n",
                  thought_signature: "sig3",
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
