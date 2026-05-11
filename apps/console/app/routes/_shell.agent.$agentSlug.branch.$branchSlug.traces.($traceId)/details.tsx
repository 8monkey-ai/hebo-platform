import { ChevronDown, ChevronRight, ChevronUp, Wrench } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@hebo/shared-ui/components/Alert";
import { Badge } from "@hebo/shared-ui/components/Badge";
import { Button } from "@hebo/shared-ui/components/Button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@hebo/shared-ui/components/Collapsible";
import { CopyButton } from "@hebo/shared-ui/components/CopyButton";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@hebo/shared-ui/components/Empty";
import { ScrollArea } from "@hebo/shared-ui/components/ScrollArea";
import { Spinner } from "@hebo/shared-ui/components/Spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@hebo/shared-ui/components/Tabs";
import { cn } from "@hebo/shared-ui/lib/utils";

import type {
  TraceDetailData,
  TraceMessage,
  MessagePart,
} from "../_shell.agent.$agentSlug.branch.$branchSlug.traces/types";
import {
  formatDuration,
  formatTimestampFull,
  formatTokenCount,
} from "../_shell.agent.$agentSlug.branch.$branchSlug.traces/utils";

const COLLAPSE_TOGGLE_CLASS_NAME =
  "mt-3 h-auto rounded-full border border-border/60 px-2 py-1 text-xs font-medium text-foreground hover:bg-muted data-[panel-open]:bg-transparent data-[panel-open]:hover:bg-muted";
const INLINE_DISCLOSURE_CLASS_NAME =
  "h-auto gap-1 bg-transparent px-0 py-0 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground active:bg-transparent data-[panel-open]:bg-transparent";
const CODE_BLOCK_CLASS_NAME =
  "overflow-x-auto rounded-sm bg-muted/30 p-3 text-xs break-words whitespace-pre-wrap text-foreground";

type TraceDetailProps = { trace: TraceDetailData | null; loading: boolean };

export function TraceDetail({ trace, loading }: TraceDetailProps) {
  if (loading) {
    return (
      <DetailShell className="items-center justify-center">
        <Spinner className="size-6 -translate-y-6 text-muted-foreground" />
      </DetailShell>
    );
  }

  if (!trace) {
    return (
      <DetailShell>
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Select a trace</EmptyTitle>
            <EmptyDescription>Select a trace to view details.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </DetailShell>
    );
  }

  const toolCallCount = trace.outputMessages.reduce(
    (count, message) => count + extractMessageParts(message).toolCalls.length,
    0,
  );

  return (
    <DetailShell>
      <Tabs defaultValue="formatted" className="min-h-0 flex-1">
        <div className="shrink-0 border-b px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <h2 className="text-ellipsis-start truncate">{trace.responseModel}</h2>
              <p className="truncate text-xs text-muted-foreground">
                {[
                  trace.operationName,
                  formatTimestampFull(trace.timestamp),
                  trace.spanId.slice(0, 16),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="secondary">{formatDuration(trace.durationMs)}</Badge>
              <TraceStatusBadge status={trace.status} />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-3">
            <TabsList>
              <TabsTrigger value="formatted">Formatted</TabsTrigger>
              <TabsTrigger value="raw">Raw JSON</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
            </TabsList>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {trace.inputTokens !== null && (
                <Badge variant="secondary" className="bg-muted text-muted-foreground">
                  {formatTokenCount(trace.inputTokens)} in
                  {trace.cacheReadInputTokens !== null &&
                    ` (${formatTokenCount(trace.cacheReadInputTokens)} cached)`}
                </Badge>
              )}
              {trace.outputTokens !== null && (
                <Badge variant="secondary" className="bg-muted text-muted-foreground">
                  {formatTokenCount(trace.outputTokens)} out
                </Badge>
              )}
              {toolCallCount > 0 && (
                <Badge variant="secondary" className="bg-muted text-muted-foreground">
                  tool calls {toolCallCount}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <TabsContent value="formatted" className="h-0 min-h-0">
          <FormattedViewPanel trace={trace} />
        </TabsContent>

        <TabsContent value="raw" className="h-0 min-h-0">
          <ScrollArea className="h-full px-4 py-4">
            <RawJsonView trace={trace} />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="metadata" className="h-0 min-h-0">
          <ScrollArea className="h-full px-4 py-4">
            <MetadataView trace={trace} />
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </DetailShell>
  );
}

function TraceStatusBadge({ status }: { status: TraceDetailData["status"] }) {
  if (status === "ok")
    return (
      <Badge
        variant="secondary"
        className="border-transparent bg-green-600 text-white dark:bg-green-500 [&_a:hover]:bg-green-700 dark:[&_a:hover]:bg-green-400"
      >
        {status}
      </Badge>
    );
  if (status === "error") return <Badge variant="destructive">{status}</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function DetailShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-lg border bg-card",
        className,
      )}
    >
      {children}
    </div>
  );
}

// --- Formatted View ---

const SCROLL_THRESHOLD = 120;

function FormattedViewPanel({ trace }: { trace: TraceDetailData }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showTop, setShowTop] = useState(false);
  const [showBottom, setShowBottom] = useState(false);

  const updateButtons = () => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    setShowTop(scrollTop > SCROLL_THRESHOLD);
    setShowBottom(scrollHeight - scrollTop - clientHeight > SCROLL_THRESHOLD);
  };

  useEffect(() => {
    updateButtons();
  }, [trace]);

  return (
    <div className="relative h-full min-h-0">
      <div ref={scrollRef} onScroll={updateButtons} className="h-full overflow-y-auto px-4 py-4">
        <FormattedView trace={trace} />
      </div>

      <button
        aria-label="Jump to top"
        onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
        className={cn(
          "absolute top-3 right-3 flex size-7 items-center justify-center rounded-full border bg-background shadow-sm transition-opacity hover:bg-muted",
          showTop ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        tabIndex={showTop ? 0 : -1}
      >
        <ChevronUp className="size-3.5" />
      </button>

      <button
        aria-label="Jump to bottom"
        onClick={() =>
          scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
        }
        className={cn(
          "absolute right-3 bottom-4.5 flex size-7 items-center justify-center rounded-full border bg-background shadow-sm transition-opacity hover:bg-muted",
          showBottom ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        tabIndex={showBottom ? 0 : -1}
      >
        <ChevronDown className="size-3.5" />
      </button>
    </div>
  );
}

function FormattedView({ trace }: { trace: TraceDetailData }) {
  const inputMessages = trace.inputMessages;
  const outputMessages = trace.outputMessages;

  return (
    <div className="flex flex-col divide-y">
      {trace.status === "error" && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="whitespace-pre-wrap">
            {trace.statusMessage?.trim() || "Unknown error"}
          </AlertDescription>
        </Alert>
      )}

      {/* oxlint-disable no-array-index-key - static read-only data */}
      {inputMessages.map((msg, index) => (
        <MessageBlock key={`${trace.spanId}:in:${index}`} message={msg} />
      ))}

      {outputMessages.map((msg, index) => (
        <MessageBlock key={`${trace.spanId}:out:${index}`} message={msg} />
      ))}
      {/* oxlint-enable no-array-index-key - static read-only data */}

      {inputMessages.length === 0 && outputMessages.length === 0 && (
        <Empty className="py-8">
          <EmptyHeader>
            <EmptyTitle>No message content</EmptyTitle>
            <EmptyDescription>No message content available.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}

function extractMessageParts(message: TraceMessage) {
  const text: string[] = [];
  const reasoning: string[] = [];
  const toolCalls: Array<{ name: string; arguments: string }> = [];
  const otherParts: Array<{ type: string; value: string }> = [];

  const content = "content" in message ? message.content : undefined;

  if (typeof content === "string") {
    text.push(content);
  }

  const parts = (message.parts ?? (Array.isArray(content) ? content : [])) as MessagePart[];

  for (const part of parts) {
    switch (part.type) {
      case "text":
        text.push(part.content);
        break;
      case "reasoning":
        reasoning.push(part.content);
        break;
      case "tool_call":
        toolCalls.push({
          name: part.name,
          arguments:
            typeof part.arguments === "string"
              ? part.arguments
              : JSON.stringify(part.arguments ?? null, null, 2),
        });
        break;
      case "tool_call_response":
        text.push(
          typeof part.response === "string"
            ? part.response
            : JSON.stringify(part.response ?? null, null, 2),
        );
        break;
      default:
        {
          const unknown = part as { type: string };
          otherParts.push({ type: unknown.type, value: JSON.stringify(unknown, null, 2) });
        }
        break;
    }
  }

  return {
    texts: text.map((t) => t.trim()).filter(Boolean),
    reasoning: reasoning.join("\n").trim(),
    toolCalls,
    otherParts,
  };
}

function buildMessageCopyText({
  texts,
  reasoning,
  toolCalls,
  otherParts,
}: ReturnType<typeof extractMessageParts>): string {
  const sections: string[] = [];
  if (reasoning) sections.push(reasoning);
  sections.push(...texts);
  for (const tc of toolCalls) sections.push(`${tc.name}\n${tc.arguments}`);
  for (const part of otherParts) sections.push(`${part.type}\n${part.value}`);
  return sections.join("\n\n");
}

const ROLE_ACCENTS: Record<string, string> = {
  system: "border-l-amber-500",
  user: "border-l-blue-500",
  assistant: "border-l-green-500",
  tool: "border-l-violet-500",
};

function MessageBlock({ message }: { message: TraceMessage }) {
  const { texts, reasoning, toolCalls, otherParts } = extractMessageParts(message);

  return (
    <section className="py-4 first:pt-0 last:pb-0">
      <div
        className={cn("space-y-2 border-l-2 pl-3", ROLE_ACCENTS[message.role] ?? "border-l-border")}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold tracking-tight">
              {message.role.charAt(0).toUpperCase() + message.role.slice(1)}
            </span>

            {message.role === "tool" && message.name && (
              <Badge variant="outline">
                <Wrench className="size-3" />
                {message.name}
              </Badge>
            )}
          </div>

          <CopyButton
            value={() => buildMessageCopyText({ texts, reasoning, toolCalls, otherParts })}
          />
        </div>

        {!reasoning && texts.length === 0 && toolCalls.length === 0 && otherParts.length === 0 ? (
          <p className="text-xs text-muted-foreground opacity-50">(no message)</p>
        ) : (
          <div className="space-y-3">
            {reasoning && (
              <ExpandableContent label="Reasoning">
                <p className="text-xs whitespace-pre-wrap text-muted-foreground italic">
                  {reasoning}
                </p>
              </ExpandableContent>
            )}

            {/* oxlint-disable no-array-index-key - static read-only data */}
            {texts.map((text, index) =>
              texts.length > 1 ? (
                <div key={`msg:${index}`} className="rounded-sm bg-muted/30 px-2 py-1.5">
                  <CollapsibleText text={text} maxLength={500} />
                </div>
              ) : (
                <CollapsibleText key={`msg:${index}`} text={text} maxLength={500} />
              ),
            )}

            {toolCalls.map((tc, index) => (
              <div key={`tool-call:${index}`} className="space-y-2">
                <Badge variant="outline">
                  <Wrench className="size-3" />
                  {tc.name}
                </Badge>
                <CollapsibleCode code={tc.arguments} maxLength={300} />
              </div>
            ))}

            {otherParts.map((part, index) => (
              <div key={`${part.type}:${index}`} className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground uppercase">
                  {part.type}
                </div>
                <CollapsibleCode code={part.value} maxLength={300} />
              </div>
            ))}
            {/* oxlint-enable no-array-index-key - static read-only data */}
          </div>
        )}
      </div>
    </section>
  );
}

function CollapsibleText({ text, maxLength }: { text: string; maxLength: number }) {
  const [expanded, setExpanded] = useState(false);
  const needsTruncation = text.length > maxLength;

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <p
        className={cn(
          "text-xs wrap-break-word whitespace-pre-wrap",
          !expanded && needsTruncation && "line-clamp-6",
        )}
      >
        {text}
      </p>
      {needsTruncation && (
        <CollapsibleTrigger
          render={
            <Button variant="ghost" size="sm" className={COLLAPSE_TOGGLE_CLASS_NAME}>
              {expanded ? <ChevronUp className="size-3" /> : <ChevronRight className="size-3" />}
              <span>{expanded ? "Less" : "More"}</span>
            </Button>
          }
        />
      )}
    </Collapsible>
  );
}

function CollapsibleCode({ code, maxLength }: { code: string; maxLength: number }) {
  const [expanded, setExpanded] = useState(false);
  const needsTruncation = code.length > maxLength;

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <pre
        className={cn(
          CODE_BLOCK_CLASS_NAME,
          !expanded && needsTruncation && "max-h-40 overflow-hidden",
        )}
      >
        {code}
      </pre>
      {needsTruncation && (
        <CollapsibleTrigger
          render={
            <Button variant="ghost" size="sm" className={COLLAPSE_TOGGLE_CLASS_NAME}>
              {expanded ? <ChevronUp className="size-3" /> : <ChevronRight className="size-3" />}
              <span>{expanded ? "Less" : "More"}</span>
            </Button>
          }
        />
      )}
    </Collapsible>
  );
}

function ExpandableContent({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Collapsible>
      <CollapsibleTrigger
        render={
          <Button variant="ghost" size="sm" className={cn("group", INLINE_DISCLOSURE_CLASS_NAME)}>
            <ChevronRight className="size-3 transition-transform group-data-panel-open:rotate-90" />
            <span>{label}</span>
          </Button>
        }
      />
      <CollapsibleContent className="pt-1">{children}</CollapsibleContent>
    </Collapsible>
  );
}

// --- Raw JSON View ---

function RawJsonView({ trace }: { trace: TraceDetailData }) {
  const jsonStr = JSON.stringify(trace, null, 2);

  return (
    <div className="relative">
      <CopyButton value={jsonStr} className="absolute top-2.5 right-2.5" />
      <pre className={CODE_BLOCK_CLASS_NAME}>{jsonStr}</pre>
    </div>
  );
}

// --- Metadata View ---

function MetadataView({ trace }: { trace: TraceDetailData }) {
  const metadataEntries = Object.entries(trace.metadata).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="flex flex-col gap-5">
      {metadataEntries.length > 0 && (
        <div>
          <h3 className="mb-3">Request Metadata</h3>
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-xs">
              <tbody>
                {metadataEntries.map(([key, value]) => (
                  <IdentifierRow key={key} label={key} value={value} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-3">Identifiers</h3>
        <div className="overflow-hidden rounded-md border">
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
              <IdentifierRow label="Reasoning Effort" value={trace.reasoningEffort ?? null} />
              <IdentifierRow
                label="Reasoning Enabled"
                value={trace.reasoningEnabled == null ? null : String(trace.reasoningEnabled)}
              />
              <IdentifierRow
                label="Reasoning Max Tokens"
                value={trace.reasoningMaxTokens == null ? null : String(trace.reasoningMaxTokens)}
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
      <td className="w-1/3 px-3 py-2 font-medium text-muted-foreground">{label}</td>
      <td className="px-3 py-2 break-all">
        <div className="flex items-center gap-1">
          <span className="min-w-0 flex-1">{value}</span>
          <CopyButton value={value} className="size-5 shrink-0 p-0" />
        </div>
      </td>
    </tr>
  );
}
