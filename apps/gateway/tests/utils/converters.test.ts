import { describe, expect, test } from "bun:test";

import {
  toModelMessages,
  toOpenAICompatibleMessage,
} from "~gateway/utils/converters";
import type { OpenAICompatibleMessage } from "~gateway/utils/openai-compatible-api-schemas";

import type { GenerateTextResult, ModelMessage } from "ai";

describe("toModelMessages", () => {
  test("bundles parallel tool calls into a single tool message with multiple tool-result parts", () => {
    const messages: OpenAICompatibleMessage[] = [
      {
        role: "system",
        content: "You are a helpful assistant.",
      },
      {
        role: "user",
        content: "What's the weather in Boston and Seattle right now?",
      },
      {
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: "call_boston",
            type: "function",
            function: {
              name: "get_current_weather",
              arguments: JSON.stringify({
                location: "Boston, MA",
                unit: "celsius",
              }),
            },
          },
          {
            id: "call_seattle",
            type: "function",
            function: {
              name: "get_current_weather",
              arguments: JSON.stringify({
                location: "Seattle, WA",
                unit: "celsius",
              }),
            },
          },
        ],
      },
      {
        role: "tool",
        tool_call_id: "call_boston",
        content: JSON.stringify({
          location: "Boston, MA",
          temperature: 2,
          unit: "celsius",
          forecast: ["cloudy"],
        }),
      },
      {
        role: "tool",
        tool_call_id: "call_seattle",
        content: JSON.stringify({
          location: "Seattle, WA",
          temperature: 7,
          unit: "celsius",
          forecast: ["rain"],
        }),
      },
    ];

    const out = toModelMessages(messages);

    expect(out.map((m: any) => m.role)).toEqual([
      "system",
      "user",
      "assistant",
      "tool",
    ]);

    const assistant = out[2] as any;
    expect(assistant.role).toBe("assistant");
    expect(assistant.content).toHaveLength(2);

    expect(assistant.content[0]).toMatchObject({
      type: "tool-call",
      toolCallId: "call_boston",
      toolName: "get_current_weather",
      input: { location: "Boston, MA", unit: "celsius" },
    });

    expect(assistant.content[1]).toMatchObject({
      type: "tool-call",
      toolCallId: "call_seattle",
      toolName: "get_current_weather",
      input: { location: "Seattle, WA", unit: "celsius" },
    });

    const tool = out[3] as any;
    expect(tool.role).toBe("tool");
    expect(tool.content).toHaveLength(2);

    expect(tool.content.map((p: any) => p.toolCallId)).toEqual([
      "call_boston",
      "call_seattle",
    ]);

    expect(tool.content[0]).toMatchObject({
      type: "tool-result",
      toolCallId: "call_boston",
      toolName: "get_current_weather",
      output: {
        type: "json",
        value: {
          location: "Boston, MA",
          temperature: 2,
          unit: "celsius",
          forecast: ["cloudy"],
        },
      },
    });

    expect(tool.content[1]).toMatchObject({
      type: "tool-result",
      toolCallId: "call_seattle",
      toolName: "get_current_weather",
      output: {
        type: "json",
        value: {
          location: "Seattle, WA",
          temperature: 7,
          unit: "celsius",
          forecast: ["rain"],
        },
      },
    });
  });

  test("does not merge tool results across different assistant tool-call turns (same tool, different turns)", () => {
    const messages: OpenAICompatibleMessage[] = [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Weather in San Francisco?" },
      {
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: "call_sf",
            type: "function",
            function: {
              name: "get_current_weather",
              arguments: JSON.stringify({
                location: "San Francisco, CA",
                unit: "celsius",
              }),
            },
          },
        ],
      },
      {
        role: "tool",
        tool_call_id: "call_sf",
        content: JSON.stringify({
          location: "San Francisco, CA",
          temperature: 12,
          unit: "celsius",
        }),
      },

      { role: "user", content: "Also Tokyo and Paris?" },
      {
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: "call_tokyo",
            type: "function",
            function: {
              name: "get_current_weather",
              arguments: JSON.stringify({
                location: "Tokyo, JP",
                unit: "celsius",
              }),
            },
          },
          {
            id: "call_paris",
            type: "function",
            function: {
              name: "get_current_weather",
              arguments: JSON.stringify({
                location: "Paris, FR",
                unit: "celsius",
              }),
            },
          },
        ],
      },
      {
        role: "tool",
        tool_call_id: "call_tokyo",
        content: JSON.stringify({ location: "Tokyo, JP", temperature: 6 }),
      },
      {
        role: "tool",
        tool_call_id: "call_paris",
        content: JSON.stringify({ location: "Paris, FR", temperature: 4 }),
      },
    ];

    const out = toModelMessages(messages);

    expect(out.map((m: any) => m.role)).toEqual([
      "system",
      "user",
      "assistant",
      "tool",
      "user",
      "assistant",
      "tool",
    ]);

    const tool1 = out[3] as any;
    expect(tool1.role).toBe("tool");
    expect(tool1.content).toHaveLength(1);
    expect(tool1.content[0].toolCallId).toBe("call_sf");

    const tool2 = out[6] as any;
    expect(tool2.role).toBe("tool");
    expect(tool2.content).toHaveLength(2);
    expect(tool2.content.map((p: any) => p.toolCallId)).toEqual([
      "call_tokyo",
      "call_paris",
    ]);
  });

  describe("convert extra_content properties into providerOptions", () => {
    const testCases = [
      {
        name: "should convert extra_content properties for assistant message without tool calls",
        input: [
          {
            role: "assistant",
            content: "Hello",
            extra_content: { google: { thought_signature: "SIG_XYZ" } },
          },
        ],
        expected: [
          {
            role: "assistant",
            content: "Hello",
            providerOptions: {
              google: { thought_signature: "SIG_XYZ" },
            },
          },
        ],
      },
      {
        name: "should convert extra_content properties for assistant message with tool calls",
        input: [
          {
            role: "assistant",
            content: undefined,
            tool_calls: [
              {
                id: "call_1",
                type: "function",
                function: {
                  name: "test_tool",
                  arguments: "{}",
                },
                extra_content: { google: { thought_signature: "SIG_XYZ" } },
              },
            ],
          },
        ],
        expected: [
          {
            role: "assistant",
            content: [
              {
                type: "tool-call",
                toolCallId: "call_1",
                toolName: "test_tool",
                input: {},
                providerOptions: {
                  google: { thought_signature: "SIG_XYZ" },
                },
              },
            ],
          },
        ],
      },
      {
        name: "should handle empty extra_content properties gracefully",
        input: [
          {
            role: "assistant",
            content: "No extras",
          },
        ],
        expected: [
          {
            role: "assistant",
            content: "No extras",
          },
        ],
      },
    ];

    test.each(testCases)("$name", ({ input, expected }) => {
      const out = toModelMessages(input as OpenAICompatibleMessage[]);
      expect(out).toEqual(expected as ModelMessage[]);
    });
  });
});

describe("toOpenAICompatibleMessage", () => {
  const testCases = [
    {
      name: "should convert providerMetadata to extra_content for message and tool calls",
      input: {
        content: [],
        toolCalls: [
          {
            toolCallId: "call_1",
            toolName: "test_tool_1",
            input: {},
            providerMetadata: {
              google: { thought_signature: "thought_signature_tc_1" },
            },
          },
        ],
      },
      expected: {
        role: "assistant",
        // eslint-disable-next-line unicorn/no-null
        content: null,
        tool_calls: [
          {
            id: "call_1",
            type: "function",
            function: {
              name: "test_tool_1",
              arguments: "{}",
            },
            extra_content: {
              google: { thought_signature: "thought_signature_tc_1" },
            },
          },
        ],
      },
    },
    {
      name: "should convert providerMetadata to extra_content for message without tool calls",
      input: {
        content: [
          {
            type: "text",
            text: "Response text",
            providerMetadata: {
              google: { thought_signature: "thought_signature_msg" },
            },
          },
        ],
        toolCalls: [],
      },
      expected: {
        role: "assistant",
        content: "Response text",
        extra_content: {
          google: { thought_signature: "thought_signature_msg" },
        },
      },
    },
  ];

  test.each(testCases)("$name", ({ input, expected }) => {
    const out = toOpenAICompatibleMessage(
      input as unknown as GenerateTextResult<any, any>,
    );
    expect(out).toEqual(expected as any);
  });
});
