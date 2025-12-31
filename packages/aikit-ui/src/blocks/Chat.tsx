"use client";

import { useChat } from "@ai-sdk/react";
import {
  Brain,
  Download,
  Edit,
  FileUp,
  Paperclip,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "#/_ai-elements/conversation";
import { Loader } from "#/_ai-elements/loader";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "#/_ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  type PromptInputMessage,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputAttachment,
  PromptInputHeader,
  PromptInputAttachments,
  PromptInputButton,
  PromptInputProvider,
  usePromptInputAttachments,
} from "#/_ai-elements/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "#/_ai-elements/reasoning";
import { Alert, AlertDescription, AlertTitle } from "#/_shadcn/ui/alert";
import { Avatar, AvatarFallback } from "#/_shadcn/ui/avatar";
import { Button } from "#/_shadcn/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "#/_shadcn/ui/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "#/_shadcn/ui/item";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/_shadcn/ui/tooltip";
import { OpenAIHttpChatTransport } from "#/lib/openai-transport";
import { cn } from "#/lib/utils";

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
  const [selectedModelAlias, setSelectedModelAlias] = useState<
    string | undefined
  >();
  const aliases = modelsConfig.map((m) => m.alias);
  const currentModelAlias =
    selectedModelAlias && aliases.includes(selectedModelAlias)
      ? selectedModelAlias
      : (aliases[0] ?? "");
  const currentModel = modelsConfig.find((m) => m.alias === currentModelAlias);

  const [input, setInput] = useState("");
  const transport = useMemo(
    () =>
      new OpenAIHttpChatTransport({
        api: currentModel?.endpoint.baseUrl + "/chat/completions",
        fetch: currentModel?.endpoint.fetch || fetch,
        credentials: currentModel?.endpoint.credentials,
      }),
    [currentModel?.endpoint.baseUrl],
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
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
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
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Shortcut: clear chat
  const clearBtnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (
        e.shiftKey &&
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "o"
      ) {
        e.preventDefault();
        if (clearBtnRef.current?.disabled) return;
        clearBtnRef.current?.click();
        chatInputRef.current?.focus();
      }
    }

    globalThis.addEventListener("keydown", onKeyDown);
    return () => globalThis.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleSubmit = async (message: PromptInputMessage) => {
    if (status === "streaming") stop();
    if (!message.text && !message.files) return;

    sendMessage(
      {
        text: message.text,
        files: message.files,
      },
      {
        body: {
          model: currentModel?.alias,
          // reasoningEffort: "medium"
        },
      },
    );

    setInput("");
  };

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
                className="hover:bg-sidebar-accent size-7"
                onClick={() => setMessages([])}
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
        <Conversation className="h-full">
          <ConversationContent
            className="gap-5 px-2"
            aria-label="Chat conversation"
            tabIndex={-1}
          >
            {messages.map((message) => (
              <div key={message.id}>
                {message.parts.map((part, i) => {
                  switch (part.type) {
                    case "text": {
                      return (
                        <Message
                          from={message.role}
                          key={`${message.id}-${i}`}
                          tabIndex={-1}
                          role="article"
                          aria-label={`Message from ${message.role}`}
                        >
                          <MessageContent>
                            <MessageResponse>{part.text}</MessageResponse>
                          </MessageContent>
                        </Message>
                      );
                    }
                    case "reasoning": {
                      return (
                        mode === "full" && (
                          <Reasoning
                            key={`${message.id}-${i}`}
                            className="w-full"
                            isStreaming={
                              status === "streaming" &&
                              i === message.parts.length - 1 &&
                              message.id === messages.at(-1)?.id
                            }
                          >
                            <ReasoningTrigger />
                            <ReasoningContent>{part.text}</ReasoningContent>
                          </Reasoning>
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
                          className="bg-card ml-auto w-3xs py-2"
                        >
                          <a
                            href={part.url}
                            download={part.filename}
                            className="contents"
                          >
                            <ItemMedia className="translate-y-0! self-center!">
                              <FileUp size={24} className="text-foreground" />
                            </ItemMedia>
                            <ItemContent className="gap-0 truncate">
                              <ItemTitle>{part.filename}</ItemTitle>
                              <ItemDescription>
                                {part.mediaType}
                              </ItemDescription>
                            </ItemContent>
                            <ItemActions>
                              <Download className="size-4" />
                            </ItemActions>
                          </a>
                        </Item>
                      );
                    }
                    default: {
                      // FUTURE: add tool support
                      return;
                    }
                  }
                })}
              </div>
            ))}
            {status === "submitted" && <Loader />}
            {error && (
              <Alert variant="destructive" className="overflow-x-auto">
                <TriangleAlert />
                <AlertTitle>Something went wrong 🙉</AlertTitle>
                <AlertDescription>
                  <p>{error.message}</p>
                </AlertDescription>
              </Alert>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      )}

      {/* Input area */}
      <PromptInputProvider>
        <PromptInput
          onSubmit={handleSubmit}
          role="form"
          className="bg-background mt-4 rounded-md"
          globalDrop
          multiple
        >
          <PromptInputHeader className="p-0">
            <PromptInputAttachments className="max-w-full pb-0">
              {(attachment) => (
                <PromptInputAttachment data={attachment} className="truncate" />
              )}
            </PromptInputAttachments>
          </PromptInputHeader>
          <PromptInputBody>
            <PromptInputTextarea
              ref={chatInputRef}
              disabled={!currentModelAlias}
              onChange={(e) => setInput(e.target.value)}
              value={input}
              placeholder="Ask anything …"
              aria-label="Chat message input"
              aria-describedby="input-help"
              className="min-h-0 pb-0"
            />

            {/* Hidden help text */}
            <div id="input-help" className="sr-only">
              Press Enter to send message, Shift+Enter for new line
            </div>
          </PromptInputBody>

          <PromptInputFooter className="pb-2">
            <PromptInputTools className="h-6 w-full">
              {/* File upload */}
              <PromptInputActionAddAttachment ref={attachBtnRef} />

              {/* Model selector */}
              {modelsConfig.length > 1 && (
                <PromptInputSelect
                  id="chat-model-select"
                  onValueChange={(alias) =>
                    setSelectedModelAlias(alias as string)
                  }
                  value={currentModelAlias}
                  disabled={status === "submitted" || modelsConfig.length === 0}
                  aria-label="Select model"
                >
                  <PromptInputSelectTrigger className="ml-auto max-w-3xs">
                    <>
                      <Brain />
                      <PromptInputSelectValue className="truncate" />
                    </>
                  </PromptInputSelectTrigger>
                  <PromptInputSelectContent>
                    {modelsConfig.map((model) => (
                      <PromptInputSelectItem
                        key={model.alias}
                        value={model.alias}
                      >
                        {model.alias.split("/").pop()}
                      </PromptInputSelectItem>
                    ))}
                  </PromptInputSelectContent>
                </PromptInputSelect>
              )}
            </PromptInputTools>

            {/* Submit button - disable when no model is selected */}
            <PromptInputSubmit
              disabled={
                !currentModelAlias || (!input && status !== "streaming")
              }
              status={status === "error" ? "ready" : status}
            />
          </PromptInputFooter>
        </PromptInput>
      </PromptInputProvider>
    </div>
  );
}

export function PromptInputActionAddAttachment(
  props: React.ComponentProps<typeof PromptInputButton>,
) {
  const attachments = usePromptInputAttachments();

  return (
    <PromptInputButton
      {...props}
      className="-ml-1.5"
      onClick={() => {
        attachments.openFileDialog();
      }}
      aria-label="Add attachment"
    >
      <Paperclip className="size-4" />
    </PromptInputButton>
  );
}
