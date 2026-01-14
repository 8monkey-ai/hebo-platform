import { jsonSchema, tool } from "ai";

import type {
  OpenAICompatibleAssistantMessage,
  OpenAICompatibleMessageToolCall,
  OpenAICompatibleUserMessage,
  OpenAICompatibleContentPart,
  OpenAICompatibleFinishReason,
  OpenAICompatibleMessage,
  OpenAICompatibleTool,
  OpenAICompatibleToolChoice,
  OpenAICompatibleToolCallDelta,
  OpenAICompatibleToolMessage,
} from "./openai-compatible-api-schemas";
import type {
  FinishReason,
  GenerateTextResult,
  ModelMessage,
  StreamTextResult,
  ToolChoice,
  ToolResultPart,
} from "ai";

function convertToModelContent(content: OpenAICompatibleContentPart[]) {
  return content.map((part) => {
    if (part.type === "image_url") {
      const url = part.image_url.url;
      if (url.startsWith("data:")) {
        const [metadata, base64Data] = url.split(",");
        const mimeType = metadata.split(":")[1].split(";")[0];

        return mimeType.startsWith("image/")
          ? {
              type: "image" as const,
              image: Buffer.from(base64Data, "base64"),
              mediaType: mimeType,
            }
          : {
              type: "file" as const,
              data: Buffer.from(base64Data, "base64"),
              mediaType: mimeType,
            };
      }
      // It's a regular URL, we assume it's an image
      return {
        type: "image" as const,
        image: new URL(url),
      };
    }
    if (part.type === "file") {
      const { data, media_type } = part.file;
      return media_type.startsWith("image/")
        ? {
            type: "image" as const,
            image: Buffer.from(data, "base64"),
            mediaType: media_type,
          }
        : {
            type: "file" as const,
            data: Buffer.from(data, "base64"),
            mediaType: media_type,
          };
    }
    return part;
  });
}

function parseToolOutput(content: string) {
  try {
    return { type: "json" as const, value: JSON.parse(content) };
  } catch {
    return { type: "text" as const, value: content };
  }
}

export function toModelMessages(messages: OpenAICompatibleMessage[]) {
  const modelMessages: ModelMessage[] = [];
  const toolById = indexToolMessages(messages);

  for (const message of messages) {
    if (message.role === "tool") continue;

    if (message.role === "system") {
      modelMessages.push(message as ModelMessage);
      continue;
    }

    if (message.role === "user") {
      modelMessages.push(toUserModelMessage(message));
      continue;
    }

    modelMessages.push(toAssistantModelMessage(message));
    const toolResult = toToolResultMessage(message, toolById);
    if (toolResult) modelMessages.push(toolResult);
  }

  return modelMessages;
}

function indexToolMessages(messages: OpenAICompatibleMessage[]) {
  const map = new Map<string, OpenAICompatibleToolMessage>();
  for (const m of messages) {
    if (m.role === "tool") map.set(m.tool_call_id, m);
  }
  return map;
}

function toUserModelMessage(
  message: OpenAICompatibleUserMessage,
): ModelMessage {
  if (Array.isArray(message.content)) {
    return { role: "user", content: convertToModelContent(message.content) };
  }
  return message as ModelMessage;
}

function toAssistantModelMessage(
  message: OpenAICompatibleAssistantMessage,
): ModelMessage {
  const { tool_calls, role, content, extra_content } = message;
  const providerOptions = extra_content?.google?.thought_signature
    ? {
        google: {
          thoughtSignature: extra_content.google.thought_signature,
        },
      }
    : undefined;

  if (!tool_calls || tool_calls.length === 0) {
    return {
      role: role,
      content: content,
      providerOptions,
    } as ModelMessage;
  }

  return {
    role: role,
    content: tool_calls.map((tc: OpenAICompatibleMessageToolCall) => {
      const { id, function: fn, extra_content } = tc;
      return {
        type: "tool-call",
        toolCallId: id,
        toolName: fn.name,
        input: parseToolInput(fn.arguments),
        providerOptions: extra_content?.google?.thought_signature
          ? {
              google: {
                thoughtSignature: extra_content.google.thought_signature,
              },
            }
          : undefined,
      };
    }),
    providerOptions,
  };
}

function toToolResultMessage(
  message: OpenAICompatibleAssistantMessage,
  toolById: Map<string, OpenAICompatibleToolMessage>,
): ModelMessage | undefined {
  const toolCalls = message.tool_calls ?? [];
  if (toolCalls.length === 0) return undefined;

  const toolResultParts: ToolResultPart[] = [];
  for (const tc of toolCalls) {
    const toolMsg = toolById.get(tc.id);
    if (!toolMsg) continue;

    toolResultParts.push({
      type: "tool-result",
      toolCallId: tc.id,
      toolName: tc.function.name,
      output: parseToolOutput(toolMsg.content as string),
    });
  }

  return toolResultParts.length > 0
    ? ({ role: "tool", content: toolResultParts } as ModelMessage)
    : undefined;
}

function parseToolInput(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export const toOpenAICompatibleFinishReason = (
  finishReason: FinishReason,
): OpenAICompatibleFinishReason => {
  if (
    finishReason === "error" ||
    finishReason === "other" ||
    finishReason === "unknown"
  ) {
    return "stop";
  }
  return finishReason.replaceAll("-", "_") as OpenAICompatibleFinishReason;
};

export const toOpenAICompatibleMessage = (
  result: GenerateTextResult<any, any>,
): OpenAICompatibleAssistantMessage => {
  const message: OpenAICompatibleAssistantMessage = {
    role: "assistant",
    // eslint-disable-next-line unicorn/no-null
    content: null,
  };

  if (result.toolCalls && result.toolCalls.length > 0) {
    message.tool_calls = result.toolCalls.map((toolCall) => ({
      id: toolCall.toolCallId,
      type: "function" as const,
      function: {
        name: toolCall.toolName,
        arguments: JSON.stringify(toolCall.input),
      },
      extra_content: toolCall.providerMetadata,
    }));
  } else {
    message.content = result.text;
  }

  if (result.reasoningText) {
    message.reasoning_content = result.reasoningText;
  }

  return message;
};

export const toToolSet = (tools: OpenAICompatibleTool[] | undefined) => {
  if (!tools) {
    return;
  }

  const toolSet: Record<string, any> = {};
  for (const t of tools) {
    toolSet[t.function.name] = tool({
      description: t.function.description,
      inputSchema: jsonSchema(t.function.parameters),
    });
  }
  return toolSet;
};

export const toToolChoice = (
  toolChoice: OpenAICompatibleToolChoice | undefined,
): ToolChoice<any> | undefined => {
  if (!toolChoice) {
    return undefined;
  }

  if (
    toolChoice === "none" ||
    toolChoice === "auto" ||
    toolChoice === "required"
  ) {
    return toolChoice;
  }

  return {
    type: "tool",
    toolName: toolChoice.function.name,
  };
};

export const toOpenAiCompatibleError = (
  message: string,
  type: "invalid_request_error" | "server_error" = "server_error",
  code?: string,
) => ({ error: { message, type, param: undefined, code } });

export function toOpenAICompatibleStream(
  result: StreamTextResult<any, any>,
  model: string,
): ReadableStream<Uint8Array> {
  const streamId = `chatcmpl-${crypto.randomUUID()}`;
  const creationTime = Math.floor(Date.now() / 1000);
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const enqueue = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const enqueueError = (error: unknown) => {
        const msg =
          error instanceof Error
            ? error.message
            : "An error occurred during streaming";
        const e = error as { code?: string; status?: number };
        enqueue(
          toOpenAiCompatibleError(
            msg,
            e.status && e.status < 500
              ? "invalid_request_error"
              : "server_error",
            e.code,
          ),
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      };

      let toolCallIndexCounter = 0;

      const iterator = result.fullStream[Symbol.asyncIterator]();

      while (true) {
        let iterResult;
        try {
          iterResult = await iterator.next();
        } catch (error) {
          enqueueError(error);
          return;
        }

        if (iterResult.done) {
          break;
        }

        const part = iterResult.value;

        switch (part.type) {
          case "text-delta": {
            const delta = {
              role: "assistant",
              content: part.text,
            };
            enqueue({
              id: streamId,
              object: "chat.completion.chunk",
              created: creationTime,
              model,
              // eslint-disable-next-line unicorn/no-null
              choices: [{ index: 0, delta, finish_reason: null }],
            });
            break;
          }

          case "reasoning-delta": {
            const delta = {
              reasoning_content: part.text,
            };
            enqueue({
              id: streamId,
              object: "chat.completion.chunk",
              created: creationTime,
              model,
              // eslint-disable-next-line unicorn/no-null
              choices: [{ index: 0, delta, finish_reason: null }],
            });
            break;
          }

          case "tool-call": {
            const { toolCallId, toolName, input, providerMetadata } = part;

            const toolCall: OpenAICompatibleToolCallDelta = {
              id: toolCallId,
              index: toolCallIndexCounter++,
              type: "function",
              function: { name: toolName, arguments: JSON.stringify(input) },
              extra_content: model.startsWith("google")
                ? {
                    google: {
                      thought_signature:
                        providerMetadata?.google?.thoughtSignature,
                    },
                  }
                : providerMetadata,
            };

            enqueue({
              id: streamId,
              object: "chat.completion.chunk",
              created: creationTime,
              model,
              choices: [
                {
                  index: 0,
                  delta: { tool_calls: [toolCall] },
                  // eslint-disable-next-line unicorn/no-null
                  finish_reason: null,
                },
              ],
            });
            break;
          }

          case "finish": {
            const { finishReason, totalUsage } = part;
            enqueue({
              id: streamId,
              object: "chat.completion.chunk",
              created: creationTime,
              model,
              choices: [
                {
                  index: 0,
                  delta: {},
                  finish_reason: toOpenAICompatibleFinishReason(finishReason),
                },
              ],
              usage: totalUsage && {
                prompt_tokens: totalUsage.inputTokens ?? 0,
                completion_tokens: totalUsage.outputTokens ?? 0,
                total_tokens:
                  totalUsage.totalTokens ??
                  (totalUsage.inputTokens ?? 0) +
                    (totalUsage.outputTokens ?? 0),
                completion_tokens_details: {
                  reasoning_tokens: totalUsage.reasoningTokens ?? 0,
                },
                prompt_tokens_details: {
                  cached_tokens: totalUsage.cachedInputTokens ?? 0,
                },
              },
            });
            break;
          }

          case "error": {
            enqueueError(part.error);
            return;
          }
        }
      }

      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

export function toOpenAICompatibleNonStreamResponse(
  result: GenerateTextResult<any, any>,
  model: string,
) {
  const finish_reason = toOpenAICompatibleFinishReason(result.finishReason);

  return {
    id: "chatcmpl-" + crypto.randomUUID(),
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: toOpenAICompatibleMessage(result),
        finish_reason,
      },
    ],
    usage: result.usage && {
      prompt_tokens: result.usage.inputTokens ?? 0,
      completion_tokens: result.usage.outputTokens ?? 0,
      total_tokens:
        result.usage.totalTokens ??
        (result.usage.inputTokens ?? 0) + (result.usage.outputTokens ?? 0),
      completion_tokens_details: {
        reasoning_tokens: result.usage.reasoningTokens ?? 0,
      },
      prompt_tokens_details: {
        cached_tokens: result.usage.cachedInputTokens ?? 0,
      },
    },
  };
}
