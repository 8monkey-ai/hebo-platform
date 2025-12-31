import { describe, expect, test } from "bun:test";

import { toModelMessages } from "~gateway/utils/converters";
import type { OpenAICompatibleMessage } from "~gateway/utils/openai-compatible-api-schemas";

import type { ModelMessage } from "ai";

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

  describe("merges extra_ properties into providerOptions", () => {
    const testCases = [
      {
        name: "should merge extra_ properties for assistant message without tool calls",
        inputMessages: [
          {
            role: "assistant",
            content: "Hello",
            extra_body: { reasoning_effort: "high" },
            extra_overrides: { verbosity: "medium" },
          },
        ],
        expectedOutput: [
          {
            role: "assistant",
            content: "Hello",
            providerOptions: { reasoning_effort: "high", verbosity: "medium" },
          },
        ],
      },
      {
        name: "should merge multiple extra_ properties for assistant message with tool calls",
        inputMessages: [
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
                extra_body: { reasoning_effort: "high" },
                extra_content: { thought_signature: "TOOL_SIG_XYZ" },
              },
            ],
            extra_body: { resoning_effort: "high" },
          },
        ],
        expectedOutput: [
          {
            role: "assistant",
            content: [
              {
                type: "tool-call",
                toolCallId: "call_1",
                toolName: "test_tool",
                input: {},
                providerOptions: {
                  reasoning_effort: "high",
                  thought_signature: "TOOL_SIG_XYZ",
                },
              },
            ],
            providerOptions: { resoning_effort: "high" },
          },
        ],
      },
      {
        name: "should handle empty extra_ properties gracefully",
        inputMessages: [
          {
            role: "assistant",
            content: "No extras",
          },
        ],
        expectedOutput: [
          {
            role: "assistant",
            content: "No extras",
          },
        ],
      },
    ];

    test.each(testCases)("$name", ({ inputMessages, expectedOutput }) => {
      const out = toModelMessages(inputMessages as OpenAICompatibleMessage[]);
      expect(out).toEqual(expectedOutput as ModelMessage[]);
    });
  });
});
