import { ChevronDown, ChevronRight, Loader2, Wrench } from "lucide-react";
import { useState } from "react";

import { Badge } from "@hebo/shared-ui/components/Badge";
import { CopyButton } from "@hebo/shared-ui/components/CopyButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@hebo/shared-ui/components/Tabs";

import type { TraceDetailData } from "./types";
import {
  formatDuration,
  formatTimestampFull,
  formatTokenCount,
  getTraceStatusBadgeProps,
} from "./utils";
type TraceDetailProps = { trace: TraceDetailData | null; loading: boolean };

export function TraceDetail({ trace, loading }: TraceDetailProps) {
  if (loading) {
    return (
      <DetailShell>
        <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-4">
          <div className="-translate-y-6">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        </div>
      </DetailShell>
    );
  }

  if (!trace) {
    return (
      <DetailShell>
        <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-4 text-sm text-muted-foreground">
          <div className="-translate-y-6">Select a trace to view details</div>
        </div>
      </DetailShell>
    );
  }

  const toolCallCount = countToolCalls(trace.outputMessages);
  const statusBadge = getTraceStatusBadgeProps(trace.status);

  return (
    <DetailShell>
      <Tabs defaultValue="formatted" className="flex min-h-0 flex-1 flex-col">
        <div className="border-b px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold tracking-tight">
                {trace.responseModel}
              </h2>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {[
                  trace.operationName,
                  formatTimestampFull(trace.timestamp),
                  `${trace.spanId.slice(0, 16)}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="secondary" className="font-normal">
                {formatDuration(trace.durationMs)}
              </Badge>
              <Badge variant={statusBadge.variant} className={statusBadge.className}>
                {trace.status}
              </Badge>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="formatted">Formatted details</TabsTrigger>
              <TabsTrigger value="raw">Raw JSON</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
            </TabsList>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 text-xs text-muted-foreground">
              {trace.inputTokens !== null && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                  <span className="font-medium">{formatTokenCount(trace.inputTokens)}</span>
                  <span>in</span>
                </span>
              )}
              {trace.outputTokens !== null && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                  <span className="font-medium">{formatTokenCount(trace.outputTokens)}</span>
                  <span>out</span>
                </span>
              )}
              {toolCallCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                  <span>tool call</span>
                  <span className="font-medium">{toolCallCount}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <TabsContent value="formatted" className="mt-0 min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <FormattedView trace={trace} />
        </TabsContent>

        <TabsContent value="raw" className="mt-0 min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <RawJsonView trace={trace} />
        </TabsContent>

        <TabsContent value="metadata" className="mt-0 min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <MetadataView trace={trace} />
        </TabsContent>
      </Tabs>
    </DetailShell>
  );
}

function DetailShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border bg-card">
      {children}
    </div>
  );
}

// --- Formatted View ---

function FormattedView({ trace }: { trace: TraceDetailData }) {
  const inputMessages = normalizeMessages(trace.inputMessages);
  const outputMessages = normalizeMessages(trace.outputMessages);

  return (
    <div className="flex min-h-0 flex-col divide-y">
      {inputMessages.map((msg) => (
        <MessageBlock key={getMessageKey("in", msg)} message={msg} />
      ))}

      {outputMessages.map((msg) => (
        <MessageBlock key={getMessageKey("out", msg)} message={msg} />
      ))}

      {inputMessages.length === 0 && outputMessages.length === 0 && (
        <p className="text-sm text-muted-foreground">No message content available.</p>
      )}
    </div>
  );
}

type NormalizedMessage = {
  role: string;
  content: string;
  toolCalls: Array<{ name: string; arguments: string }>;
  toolName?: string;
  reasoning?: string;
};

function normalizeMessages(messages: TraceDetailData["inputMessages"]): NormalizedMessage[] {
  return messages.map((message) => {
    const textParts: string[] = [];
    const toolCalls: Array<{ name: string; arguments: string }> = [];
    let reasoning: string | undefined;

    if (typeof message.content === "string") {
      textParts.push(message.content);
    } else if (Array.isArray(message.content)) {
      for (const part of message.content) {
        if (!part || typeof part !== "object") continue;
        const { type, text } = part as { type?: unknown; text?: unknown };
        if (type === "text" && typeof text === "string") {
          textParts.push(text);
        } else if (type === "reasoning" && typeof text === "string") {
          reasoning = text;
        }
      }
    }

    for (const part of Array.isArray(message.parts) ? message.parts : []) {
      if (!part || typeof part !== "object") continue;

      const {
        type,
        content,
        name,
        arguments: args,
      } = part as {
        type?: unknown;
        content?: unknown;
        name?: unknown;
        arguments?: unknown;
      };

      if (type === "text" && typeof content === "string") {
        textParts.push(content);
      } else if (type === "reasoning" && typeof content === "string") {
        reasoning = content;
      } else if (type === "tool_call" && typeof name === "string" && typeof args === "string") {
        toolCalls.push({ name, arguments: args });
      }
    }

    for (const toolCall of Array.isArray(message.tool_calls) ? message.tool_calls : []) {
      if (!toolCall || typeof toolCall !== "object") continue;
      const fn =
        "function" in toolCall && toolCall.function && typeof toolCall.function === "object"
          ? toolCall.function
          : null;

      if (
        fn &&
        "name" in fn &&
        typeof fn.name === "string" &&
        "arguments" in fn &&
        typeof fn.arguments === "string"
      ) {
        toolCalls.push({ name: fn.name, arguments: fn.arguments });
      }
    }

    return {
      role: message.role,
      content: textParts.join("\n"),
      toolCalls,
      toolName: message.role === "tool" ? message.name : undefined,
      reasoning,
    };
  });
}

function MessageBlock({ message }: { message: NormalizedMessage }) {
  const roleAccents: Record<string, string> = {
    system: "border-l-amber-500",
    user: "border-l-blue-500",
    assistant: "border-l-green-500",
    tool: "border-l-violet-500",
  };
  const roleLabel = message.role.charAt(0).toUpperCase() + message.role.slice(1);
  const fullContent = buildFullContent(message);

  return (
    <section
      className={`space-y-3 border-l-2 py-4 pl-3 first:pt-0 last:pb-0 ${roleAccents[message.role] ?? "border-l-border"}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold tracking-tight">{roleLabel}</span>
          {message.toolName && (
            <Badge variant="outline" className="gap-1">
              <Wrench className="size-3" />
              {message.toolName}
            </Badge>
          )}
        </div>
        {fullContent && <CopyButton value={fullContent} className="rounded-md hover:bg-muted" />}
      </div>

      {message.reasoning && (
        <ExpandableContent label="Reasoning">
          <p className="text-sm whitespace-pre-wrap text-muted-foreground italic">
            {message.reasoning}
          </p>
        </ExpandableContent>
      )}

      {message.content && <CollapsibleText text={message.content} maxLength={500} />}

      {message.toolCalls.map((tc) => (
        <div key={`${tc.name}:${tc.arguments}`} className="space-y-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Wrench className="size-3" />
            <span className="font-medium">{tc.name}</span>
          </div>
          <CollapsibleCode code={tc.arguments} maxLength={300} />
        </div>
      ))}
    </section>
  );
}

function buildFullContent(message: NormalizedMessage): string {
  const parts: string[] = [];
  if (message.reasoning) parts.push(`[Reasoning]\n${message.reasoning}`);
  if (message.content) parts.push(message.content);
  for (const tc of message.toolCalls) {
    parts.push(`[Tool Call: ${tc.name}]\n${tc.arguments}`);
  }
  return parts.join("\n\n");
}

function getMessageKey(prefix: string, message: NormalizedMessage) {
  const toolKey = message.toolCalls
    .map((toolCall) => `${toolCall.name}:${toolCall.arguments}`)
    .join("|");

  return [
    prefix,
    message.role,
    message.toolName ?? "",
    message.reasoning ?? "",
    message.content,
    toolKey,
  ].join(":");
}

function CollapsibleText({ text, maxLength }: { text: string; maxLength: number }) {
  const [expanded, setExpanded] = useState(false);
  const needsTruncation = text.length > maxLength;
  const displayText = needsTruncation && !expanded ? `${text.slice(0, maxLength)}...` : text;

  return (
    <div>
      <p className="text-xs leading-4 break-words whitespace-pre-wrap">{displayText}</p>
      {needsTruncation && (
        <button
          type="button"
          className="mt-3 inline-flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase transition-colors hover:bg-muted hover:text-foreground"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          <span>{expanded ? "Less" : "More"}</span>
        </button>
      )}
    </div>
  );
}

function CollapsibleCode({ code, maxLength }: { code: string; maxLength: number }) {
  const [expanded, setExpanded] = useState(false);
  const needsTruncation = code.length > maxLength;
  const displayCode = needsTruncation && !expanded ? `${code.slice(0, maxLength)}...` : code;

  return (
    <div>
      <pre className="overflow-x-auto rounded-lg border bg-muted/30 p-3 text-sm break-words whitespace-pre-wrap text-foreground">
        {displayCode}
      </pre>
      {needsTruncation && (
        <button
          type="button"
          className="mt-3 inline-flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase transition-colors hover:bg-muted hover:text-foreground"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          <span>{expanded ? "Less" : "More"}</span>
        </button>
      )}
    </div>
  );
}

function ExpandableContent({ label, children }: { label: string; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        type="button"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        <span>{label}</span>
      </button>
      {expanded && <div className="mt-1">{children}</div>}
    </div>
  );
}

// --- Raw JSON View ---

function RawJsonView({ trace }: { trace: TraceDetailData }) {
  const jsonStr = JSON.stringify(trace, null, 2);

  return (
    <div className="relative">
      <CopyButton
        value={jsonStr}
        className="absolute top-2.5 right-2.5 rounded-md hover:bg-muted"
      />
      <pre className="overflow-x-auto rounded-lg border bg-muted/30 p-3 text-xs break-words whitespace-pre-wrap text-foreground">
        {jsonStr}
      </pre>
    </div>
  );
}

// --- Metadata View ---

function MetadataView({ trace }: { trace: TraceDetailData }) {
  const metadataEntries = Object.entries(trace.metadata);

  return (
    <div className="flex flex-col gap-5">
      {metadataEntries.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-medium text-foreground">Request Metadata</h3>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-xs">
              <tbody>
                {metadataEntries.map(([key, value]) => (
                  <tr key={key} className="border-b last:border-b-0">
                    <td className="w-1/3 px-3 py-2 font-medium text-muted-foreground">{key}</td>
                    <td className="px-3 py-2 break-all">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-3 text-xs font-medium text-foreground">Identifiers</h3>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-xs">
            <tbody>
              <IdentifierRow label="Span ID" value={trace.spanId} />
              <IdentifierRow label="Response ID" value={trace.responseId} />
              <IdentifierRow label="Model" value={trace.model} />
              <IdentifierRow label="Response Model" value={trace.responseModel} />
              <IdentifierRow label="Provider" value={trace.provider} />
              <IdentifierRow label="Duration" value={formatDuration(trace.durationMs)} />
              <IdentifierRow
                label="Finish Reasons"
                value={trace.finishReasons?.join(", ") ?? null}
              />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function IdentifierRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <tr className="border-b last:border-b-0">
      <td className="w-1/3 px-3 py-2 align-middle font-medium text-muted-foreground">{label}</td>
      <td className="px-3 py-2 align-middle font-mono text-xs break-all">
        <div className="flex items-center gap-1">
          <span className="min-w-0 flex-1 truncate">{value}</span>
          <CopyButton
            value={value}
            className="flex size-5 shrink-0 items-center justify-center self-center p-0"
          />
        </div>
      </td>
    </tr>
  );
}

function countToolCalls(messages: TraceDetailData["outputMessages"]): number {
  return normalizeMessages(messages).reduce(
    (count, message) => count + message.toolCalls.length,
    0,
  );
}
