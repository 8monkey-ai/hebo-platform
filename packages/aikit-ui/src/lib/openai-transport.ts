import { parseJsonEventStream, type ParseResult } from "@ai-sdk/provider-utils";
import {
  HttpChatTransport,
  type HttpChatTransportInitOptions,
  type FinishReason,
  type UIMessage,
  type UIMessageChunk,
} from "ai";

type OpenAIContentPart =
  | { type: "text"; text: string }
  | {
      type: "file";
      file: { data: string; media_type: string; filename: string };
    };

type OpenAIMessage = {
  role: "system" | "user" | "assistant";
  content: string | OpenAIContentPart[];
  reasoning_content?: string;
};

type OpenAIChatDelta = {
  choices?: Array<{
    delta?: {
      content?: string;
      reasoning_content?: string | Array<{ text?: string }>;
      tool_calls?: Array<{
        index?: number;
        id?: string;
        type?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason?: string | null;
  }>;
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
};

type ToolCall = {
  id: string;
  type: string;
  name: string;
  arguments: string;
};

type OpenAIHttpChatTransportOptions =
  HttpChatTransportInitOptions<UIMessage> & {
    credentials?: RequestCredentials;
  };

export class OpenAIHttpChatTransport<
  UI_MESSAGE extends UIMessage = UIMessage,
> extends HttpChatTransport<UI_MESSAGE> {
  constructor(options: OpenAIHttpChatTransportOptions) {
    const { credentials, ...restOptions } = options;

    super({
      ...restOptions,
      prepareSendMessagesRequest: async ({ messages, body }) => {
        const openaiMessages = await Promise.all(
          messages.map((m) => toOpenAIMessage(m as UIMessage)),
        );

        const reasoning = body!.reasoningEffort
          ? { effort: body!.reasoningEffort }
          : undefined;

        return {
          ...(credentials ? { credentials } : {}),
          body: {
            ...body,
            messages: openaiMessages,
            stream: true,
            ...(reasoning ? { reasoning } : {}),
          },
        };
      },
    });
  }

  protected processResponseStream(
    stream: ReadableStream<Uint8Array>,
  ): ReadableStream<UIMessageChunk> {
    return handleSSEStream(stream);
  }
}

async function toOpenAIMessage(message: UIMessage): Promise<OpenAIMessage> {
  const contentParts: OpenAIContentPart[] = [];
  const reasoningText: string[] = [];

  for (const part of message.parts ?? []) {
    switch (part.type) {
      case "text": {
        contentParts.push({ type: "text", text: part.text });

        break;
      }
      case "reasoning": {
        reasoningText.push(part.text);

        break;
      }
      case "file": {
        const filePart = await toFileContent(part);
        if (filePart) contentParts.push(filePart);

        break;
      }
      // No default
    }
  }

  if (message.role === "assistant") {
    return {
      role: "assistant",
      content: contentParts.map((p) => ("text" in p ? p.text : "")).join(""),
      reasoning_content: reasoningText.join("") || undefined,
    };
  }

  return {
    role: message.role as OpenAIMessage["role"],
    content: contentParts.length > 0 ? contentParts : "",
  };
}

async function toFileContent(part: {
  mediaType?: string;
  url?: string;
  filename?: string;
}): Promise<
  | {
      type: "file";
      file: { data: string; media_type: string; filename: string };
    }
  | undefined
> {
  if (!part.url) return;
  const filename = part.filename || "file";

  if (part.url.startsWith("data:")) {
    const [meta, data] = part.url.split(",");
    const mediaType =
      part.mediaType ?? meta.slice("data:".length, meta.indexOf(";")).trim();
    if (!mediaType || !data) return;
    return { type: "file", file: { data, media_type: mediaType, filename } };
  }

  try {
    const resp = await fetch(part.url);
    const blob = await resp.blob();
    const mediaType = part.mediaType || blob.type || "application/octet-stream";
    const arrayBuffer = await blob.arrayBuffer();
    const data = toBase64(arrayBuffer);
    return { type: "file", file: { data, media_type: mediaType, filename } };
  } catch {
    return;
  }
}

function handleSSEStream(
  stream: ReadableStream<Uint8Array>,
): ReadableStream<UIMessageChunk> {
  const messageId = crypto.randomUUID();
  const textId = `text-${messageId}`;
  const reasoningId = `reasoning-${messageId}`;
  let textStarted = false;
  let reasoningStarted = false;
  let finalFinish: FinishReason | undefined;
  let hasError = false;

  return parseJsonEventStream<OpenAIChatDelta>({
    stream,
    // no schema validation; the upstream SSE format is trusted to be OpenAI delta shape
    schema: undefined as unknown as never,
  }).pipeThrough(
    new TransformStream<ParseResult<OpenAIChatDelta>, UIMessageChunk>({
      start(ctrl) {
        ctrl.enqueue({ type: "start", messageId });
      },
      transform(result, ctrl) {
        if (hasError) return;
        if (!result?.success) {
          hasError = true;
          ctrl.enqueue({
            type: "error",
            errorText: result?.error?.message ?? "Stream parse error",
          });
          return;
        }

        const parsed = result.value;

        if (parsed.error) {
          hasError = true;
          ctrl.enqueue({
            type: "error",
            errorText:
              parsed.error.message ?? "An error occurred during streaming",
          });
          return;
        }

        const delta = parsed.choices?.[0]?.delta;
        const finishReason = parsed.choices?.[0]?.finish_reason;

        if (delta?.content) {
          if (!textStarted) {
            ctrl.enqueue({ type: "text-start", id: textId });
            textStarted = true;
          }
          ctrl.enqueue({
            type: "text-delta",
            id: textId,
            delta: delta.content,
          });
        }

        if (delta?.reasoning_content) {
          if (!reasoningStarted) {
            ctrl.enqueue({ type: "reasoning-start", id: reasoningId });
            reasoningStarted = true;
          }
          ctrl.enqueue({
            type: "reasoning-delta",
            id: reasoningId,
            delta: asText(delta.reasoning_content),
          });
        }

        if (delta?.tool_calls?.length) {
          ctrl.enqueue({
            type: "data-openai-tool-calls",
            data: normalizeToolCalls(delta.tool_calls),
          });
        }

        if (finishReason) {
          finalFinish = toFinishReason(finishReason);
        }
      },
      flush(ctrl) {
        if (textStarted) ctrl.enqueue({ type: "text-end", id: textId });
        if (reasoningStarted) {
          ctrl.enqueue({ type: "reasoning-end", id: reasoningId });
        }
        ctrl.enqueue({
          type: "finish",
          finishReason: finalFinish ?? "stop",
        });
      },
    }),
  );
}

function normalizeToolCalls(
  raw: Array<{
    id?: string;
    type?: string;
    function?: { name?: string; arguments?: string };
  }>,
): ToolCall[] {
  return raw.map((tc, i) => ({
    id: tc.id ?? `tool-${i}`,
    type: tc.type ?? "function",
    name: tc.function?.name ?? "unknown",
    arguments: tc.function?.arguments ?? "",
  }));
}

function asText(
  content: string | Array<{ text?: string }> | undefined,
): string {
  if (!content) return "";
  if (typeof content === "string") return content;
  return content.map((p) => p.text ?? "").join("");
}

function toFinishReason(raw: string | null | undefined): FinishReason {
  if (!raw || raw === "null") return "stop";
  return raw.replaceAll("_", "-") as FinishReason;
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x80_00;
  let binary = "";

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCodePoint(...chunk);
  }

  return btoa(binary);
}
