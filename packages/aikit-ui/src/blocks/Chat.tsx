"use client";

import { useChat } from "@ai-sdk/react";
import {
  Brain,
  Download,
  Edit,
  FileUp,
  Paperclip,
  TriangleAlert,
  XIcon,
  ArrowUp,
  Square,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "../_shadcn/ui/alert";
import {
  Attachment,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentAction,
} from "../_shadcn/ui/attachment";
import { Avatar, AvatarFallback } from "../_shadcn/ui/avatar";
import { Bubble, BubbleContent } from "../_shadcn/ui/bubble";
import { Button } from "../_shadcn/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "../_shadcn/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "../_shadcn/ui/input-group";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "../_shadcn/ui/item";
import { Message, MessageContent } from "../_shadcn/ui/message";
import {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
} from "../_shadcn/ui/message-scroller";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../_shadcn/ui/select";
import { Spinner } from "../_shadcn/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "../_shadcn/ui/tooltip";
import { OpenAIHttpChatTransport } from "../lib/openai-transport";
import { cn } from "../lib/utils";
import { ChatMarkdown } from "./chat-markdown";
import { ChatReasoning } from "./chat-reasoning";

// Types based on models.schema.json
export type ModelsConfig = Array<{
  alias: string;
  endpoint: {
    baseUrl: string;
    fetch?: typeof fetch;
    credentials?: RequestCredentials;
  };
}>;

export type ChatMode = "simple" | "full";

export function Chat({
  modelsConfig,
  name = "Hebo AI",
  mode = "simple",
}: {
  modelsConfig: ModelsConfig;
  name?: string;
  mode?: ChatMode;
}) {
  const [selectedModelAlias, setSelectedModelAlias] = useState<string | undefined>();
  const aliases = modelsConfig.map((m) => m.alias);
  const currentModelAlias =
    selectedModelAlias && aliases.includes(selectedModelAlias)
      ? selectedModelAlias
      : (aliases[0] ?? "");
  const currentModel = modelsConfig.find((m) => m.alias === currentModelAlias);

  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Array<{ id: string; file: File }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSending, setIsSending] = useState(false);

  const transport = useMemo(
    () =>
      new OpenAIHttpChatTransport({
        api: currentModel?.endpoint.baseUrl + "/chat/completions",
        fetch: currentModel?.endpoint.fetch ?? fetch,
        credentials: currentModel?.endpoint.credentials,
      }),
    [
      currentModel?.endpoint.baseUrl,
      currentModel?.endpoint.credentials,
      currentModel?.endpoint.fetch,
    ],
  );
  const { messages, sendMessage, setMessages, status, error, stop } = useChat({
    transport,
  });

  useEffect(() => {
    if (error) {
      console.error("Chat error:", error);
    }
  }, [error]);

  // Shortcut: focus chat input field
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === "Escape") {
        e.preventDefault();
        chatInputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, []);

  // Shortcut: attachment button
  const attachBtnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "u") {
        e.preventDefault();
        attachBtnRef.current?.click();
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, []);

  // Shortcut: clear chat
  const clearBtnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.shiftKey && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "o") {
        e.preventDefault();
        if (clearBtnRef.current?.disabled) return;
        clearBtnRef.current?.click();
        chatInputRef.current?.focus();
      }
    }

    globalThis.addEventListener("keydown", onKeyDown);
    return () => {
      globalThis.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  async function handleSubmit() {
    if (!currentModelAlias || isSending || status === "submitted" || status === "streaming") return;
    if (!input.trim() && attachments.length === 0) return;

    // Let the AI SDK convert browser files to serializable message parts.
    const files = new DataTransfer();
    for (const attachment of attachments) files.items.add(attachment.file);
    setIsSending(true);
    try {
      const sending = sendMessage(
        { text: input, files: files.files },
        { body: { model: currentModelAlias } },
      );
      setInput("");
      setAttachments([]);
      await sending;
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="relative flex h-full flex-col p-2 pt-12">
      {/* Header Controls */}
      <div className="absolute top-3 left-2">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                ref={clearBtnRef}
                disabled={!currentModelAlias}
                variant="ghost"
                size="icon"
                className="size-7 hover:bg-sidebar-accent"
                onClick={() => {
                  setMessages([]);
                }}
              >
                <Edit />
              </Button>
            }
          />
          <TooltipContent>Clear conversation (⇧ + ⌘/Ctrl + O)</TooltipContent>
        </Tooltip>
      </div>

      {messages.length === 0 ? (
        // Empty Placeholder
        <Empty className={cn(currentModelAlias ? "" : "opacity-50", "-mt-12")}>
          <EmptyHeader>
            <EmptyMedia variant="default">
              <Avatar className="size-28">
                <AvatarFallback className="text-7xl">🐵</AvatarFallback>
              </Avatar>
            </EmptyMedia>
            <EmptyTitle className="text-3xl">{name}</EmptyTitle>
            <EmptyDescription>Hi, how can I help you today?</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        // Conversation area
        <MessageScrollerProvider autoScroll>
          <MessageScroller className="flex-1">
            <MessageScrollerViewport>
              <MessageScrollerContent
                className="gap-5 px-2 py-4"
                aria-label="Chat conversation"
                tabIndex={-1}
              >
                {messages.map((message) => (
                  <MessageScrollerItem
                    key={message.id}
                    messageId={message.id}
                    scrollAnchor={message.role === "user"}
                    className="flex flex-col gap-1"
                  >
                    {/* oxlint-disable no-array-index-key -- safe as append-only */}
                    {message.parts.map((part, i) => {
                      switch (part.type) {
                        case "text": {
                          return (
                            <Message
                              align={message.role === "user" ? "end" : "start"}
                              key={`${message.id}-${i}`}
                              tabIndex={-1}
                              // oxlint-disable-next-line prefer-tag-over-role -- role is forwarded to the internal DOM element
                              role="article"
                              aria-label={`Message from ${message.role}`}
                            >
                              <MessageContent>
                                {message.role === "user" ? (
                                  <Bubble align="end" variant="muted">
                                    <BubbleContent className="whitespace-pre-wrap">
                                      {part.text}
                                    </BubbleContent>
                                  </Bubble>
                                ) : (
                                  <ChatMarkdown>{part.text}</ChatMarkdown>
                                )}
                              </MessageContent>
                            </Message>
                          );
                        }
                        case "reasoning": {
                          return (
                            mode === "full" && (
                              <ChatReasoning
                                key={`${message.id}-${i}`}
                                isStreaming={
                                  status === "streaming" &&
                                  i === message.parts.length - 1 &&
                                  message.id === messages.at(-1)?.id
                                }
                              >
                                {part.text}
                              </ChatReasoning>
                            )
                          );
                        }
                        case "file": {
                          const IMAGE_TYPES = [
                            "image/jpeg",
                            "image/png",
                            "image/webp",
                            "image/gif",
                          ];
                          return IMAGE_TYPES.includes(part.mediaType) ? (
                            <img
                              key={`${message.id}-${i}`}
                              className="ml-auto h-auto w-24 rounded-lg"
                              src={part.url}
                              alt={part.filename}
                            />
                          ) : (
                            // FUTURE: currently non image file types break in the gateway
                            <Item
                              key={`${message.id}-${i}`}
                              variant="outline"
                              size="xs"
                              className="ml-auto w-3xs bg-card"
                            >
                              <a href={part.url} download={part.filename} className="contents">
                                <ItemMedia className="translate-y-0! self-center!">
                                  <FileUp size={24} className="text-foreground" />
                                </ItemMedia>
                                <ItemContent className="gap-0 truncate">
                                  <ItemTitle>{part.filename}</ItemTitle>
                                  <ItemDescription>{part.mediaType}</ItemDescription>
                                </ItemContent>
                                <ItemActions>
                                  <Download className="size-4" />
                                </ItemActions>
                              </a>
                            </Item>
                          );
                        }
                        case "custom":
                        case "dynamic-tool":
                        case "reasoning-file":
                        case "source-document":
                        case "source-url":
                        case "step-start": {
                          return null;
                        }
                        default: {
                          throw new Error(
                            `Unhandled part type: ${(part as { type: string }).type}`,
                          );
                        }
                      }
                    })}
                    {/* oxlint-enable no-array-index-key */}
                  </MessageScrollerItem>
                ))}
                {/* oxlint-disable-next-line prefer-tag-over-role -- role is forwarded to the internal DOM element */}
                {status === "submitted" && <Spinner role="status" />}
                {error && (
                  <Alert variant="destructive" className="overflow-x-auto">
                    <TriangleAlert />
                    <AlertTitle>Something went wrong 🙉</AlertTitle>
                    <AlertDescription>
                      <p>{error.message}</p>
                    </AlertDescription>
                  </Alert>
                )}
              </MessageScrollerContent>
            </MessageScrollerViewport>
            <MessageScrollerButton />
          </MessageScroller>
        </MessageScrollerProvider>
      )}

      <form
        className="mt-4"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          aria-label="Upload files"
          onChange={(event) => {
            const selected = Array.from(event.currentTarget.files ?? [], (file) => ({
              id: crypto.randomUUID(),
              file,
            }));
            setAttachments((current) => [...current, ...selected]);
            event.currentTarget.value = "";
          }}
        />
        <InputGroup className="overflow-hidden bg-background">
          {attachments.length > 0 && (
            <InputGroupAddon align="block-start" className="flex-wrap">
              {attachments.map(({ id, file }) => (
                <Attachment key={id} size="sm">
                  <AttachmentMedia>
                    <FileUp />
                  </AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle>{file.name}</AttachmentTitle>
                  </AttachmentContent>
                  <AttachmentAction
                    aria-label={`Remove ${file.name}`}
                    onClick={() => {
                      setAttachments((current) =>
                        current.filter((attachment) => attachment.id !== id),
                      );
                    }}
                  >
                    <XIcon />
                  </AttachmentAction>
                </Attachment>
              ))}
            </InputGroupAddon>
          )}
          <InputGroupTextarea
            ref={chatInputRef}
            disabled={!currentModelAlias}
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Ask anything …"
            aria-label="Chat message input"
            aria-describedby="input-help"
            className="max-h-48 min-h-0 p-3 pb-0"
          />
          <span id="input-help" className="sr-only">
            Press Enter to send message, Shift+Enter for new line
          </span>
          <InputGroupAddon align="block-end" className="pb-2">
            <InputGroupButton
              ref={attachBtnRef}
              type="button"
              variant="outline"
              size="icon-sm"
              className="rounded-full"
              onClick={() => {
                fileInputRef.current?.click();
              }}
              aria-label="Add attachment"
            >
              <Paperclip />
            </InputGroupButton>
            {modelsConfig.length > 1 && (
              <Select
                value={currentModelAlias}
                onValueChange={(alias) => {
                  if (alias) setSelectedModelAlias(alias);
                }}
                disabled={status === "submitted" || isSending}
              >
                <SelectTrigger
                  className="ml-auto max-w-3xs border-none bg-transparent shadow-none"
                  aria-label="Select model"
                >
                  <Brain />
                  <SelectValue className="truncate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {modelsConfig.map((model) => (
                      <SelectItem key={model.alias} value={model.alias}>
                        {model.alias.split("/").pop()}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
            <InputGroupButton
              type={status === "streaming" ? "button" : "submit"}
              variant="default"
              size="icon-sm"
              className={cn("rounded-full", modelsConfig.length <= 1 && "ml-auto")}
              aria-label={status === "streaming" ? "Stop" : "Submit"}
              disabled={
                !currentModelAlias ||
                status === "submitted" ||
                (status !== "streaming" &&
                  (isSending || (!input.trim() && attachments.length === 0)))
              }
              onClick={(event) => {
                if (status === "streaming") {
                  event.preventDefault();
                  void stop();
                }
              }}
            >
              {status === "streaming" ? (
                <Square />
              ) : status === "submitted" || isSending ? (
                <Spinner />
              ) : (
                <ArrowUp />
              )}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </form>
    </div>
  );
}
