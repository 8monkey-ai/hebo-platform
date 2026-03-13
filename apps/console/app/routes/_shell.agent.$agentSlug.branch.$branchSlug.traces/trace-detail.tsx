import { ChevronRight, ChevronUp, Wrench } from "lucide-react";
import { useRef, useState } from "react";

import { Badge } from "@hebo/shared-ui/components/Badge";
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

import type { TraceDetailData } from "./types";
import {
  formatDuration,
  formatTimestampFull,
  formatTokenCount,
  getTraceStatusBadgeProps,
} from "./utils";

type TraceDetailProps = { trace: TraceDetailData | null; loading: boolean };
const COLLAPSE_TOGGLE_CLASS_NAME =
  "mt-3 inline-flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-1 text-[10px] font-medium text-muted-foreground uppercase hover:bg-muted hover:text-foreground";
const CODE_BLOCK_CLASS_NAME =
  "overflow-x-auto rounded-md border bg-muted/30 p-3 text-xs break-words whitespace-pre-wrap text-foreground";

export function TraceDetail({ trace, loading }: TraceDetailProps) {
  if (loading) {
    return (
      <DetailShell>
        <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-4">
          <div className="-translate-y-6">
            <Spinner className="size-6 text-muted-foreground" />
          </div>
        </div>
      </DetailShell>
    );
  }

  if (!trace) {
    return (
      <DetailShell>
        <Empty className="min-h-0 flex-1 justify-center px-4 py-4">
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
  const statusBadge = getTraceStatusBadgeProps(trace.status);

  return (
    <DetailShell>
      <Tabs defaultValue="formatted" className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 border-b px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <h2>{trace.responseModel}</h2>
              <p className="truncate text-xs text-muted-foreground">
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
              <Badge variant="secondary">{formatDuration(trace.durationMs)}</Badge>
              <Badge variant={statusBadge.variant} className={statusBadge.className}>
                {trace.status}
              </Badge>
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

        <TabsContent value="formatted" className="mt-0 h-0 min-h-0 flex-1">
          <ScrollArea className="h-full px-4 py-4">
            <FormattedView trace={trace} />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="raw" className="mt-0 h-0 min-h-0 flex-1">
          <ScrollArea className="h-full px-4 py-4">
            <RawJsonView trace={trace} />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="metadata" className="mt-0 h-0 min-h-0 flex-1">
          <ScrollArea className="h-full px-4 py-4">
            <MetadataView trace={trace} />
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </DetailShell>
  );
}

function DetailShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border bg-card">
      {children}
    </div>
  );
}

// --- Formatted View ---

function FormattedView({ trace }: { trace: TraceDetailData }) {
  const inputMessages = trace.inputMessages;
  const outputMessages = trace.outputMessages;

  return (
    <div className="flex min-h-0 flex-col divide-y">
      {inputMessages.map((msg, index) => (
        <MessageBlock key={`${trace.spanId}:in:${index}`} message={msg} />
      ))}

      {outputMessages.map((msg, index) => (
        <MessageBlock key={`${trace.spanId}:out:${index}`} message={msg} />
      ))}

      {inputMessages.length === 0 && outputMessages.length === 0 && (
        <Empty className="min-h-0 py-8">
          <EmptyHeader>
            <EmptyTitle>No message content</EmptyTitle>
            <EmptyDescription>No message content available.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}

type TraceMessage = TraceDetailData["inputMessages"][number];

function extractMessageParts(message: TraceMessage) {
  const text: string[] = [];
  const reasoning: string[] = [];
  const toolCalls: Array<{ name: string; arguments: string }> = [];
  const otherParts: Array<{ type: string; value: string }> = [];

  if (typeof message.content === "string") {
    text.push(message.content);
  }

  const parts = message.parts ?? (Array.isArray(message.content) ? message.content : []);

  for (const part of parts) {
    switch (part.type) {
      case "text":
        text.push((part as { content: string }).content);
        break;
      case "reasoning":
        reasoning.push((part as { content: string }).content);
        break;
      case "tool_call":
        toolCalls.push({
          name: (part as { name: string }).name,
          arguments:
            typeof (part as { arguments: unknown }).arguments === "string"
              ? (part as { arguments: string }).arguments
              : JSON.stringify((part as { arguments: unknown }).arguments ?? null, null, 2),
        });
        break;
      case "tool_call_response":
        text.push(
          typeof (part as { response: unknown }).response === "string"
            ? (part as { response: string }).response
            : JSON.stringify((part as { response: unknown }).response ?? null, null, 2),
        );
        break;
      default:
        otherParts.push({
          type: part.type,
          value: JSON.stringify(part, null, 2),
        });
        break;
    }
  }

  return {
    content: text.join("\n").trim(),
    reasoning: reasoning.join("\n").trim(),
    toolCalls,
    otherParts,
  };
}

const ROLE_ACCENTS: Record<string, string> = {
  system: "border-l-amber-500",
  user: "border-l-blue-500",
  assistant: "border-l-green-500",
  tool: "border-l-violet-500",
};

function MessageBlock({ message }: { message: TraceMessage }) {
  const contentRef = useRef<HTMLDivElement>(null);

  const { content, reasoning, toolCalls, otherParts } = extractMessageParts(message);

  const roleLabel = message.role.charAt(0).toUpperCase() + message.role.slice(1);

  return (
    <section className="py-4 first:pt-0 last:pb-0">
      <div
        className={cn("space-y-3 border-l-2 pl-3", ROLE_ACCENTS[message.role] ?? "border-l-border")}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold tracking-tight">{roleLabel}</span>

            {message.role === "tool" && message.name && (
              <Badge variant="outline">
                <Wrench className="size-3" />
                {message.name}
              </Badge>
            )}
          </div>

          <CopyButton value={() => contentRef.current?.innerText ?? ""} />
        </div>

        <div ref={contentRef} className="space-y-3">
          {reasoning && (
            <ExpandableContent label="Reasoning">
              <p className="text-sm whitespace-pre-wrap text-muted-foreground italic">
                {reasoning}
              </p>
            </ExpandableContent>
          )}

          {content && <CollapsibleText text={content} maxLength={500} />}

          {toolCalls.map((tc, index) => (
            <div key={`tool-call:${index}`} className="space-y-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Wrench className="size-3" />
                <span className="font-medium">{tc.name}</span>
              </div>
              <CollapsibleCode code={tc.arguments} maxLength={300} />
            </div>
          ))}

          {otherParts.map((part, index) => (
            <div key={`${part.type}:${index}`} className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground uppercase">{part.type}</div>
              <CollapsibleCode code={part.value} maxLength={300} />
            </div>
          ))}
        </div>
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
          "text-xs leading-4 break-words whitespace-pre-wrap",
          !expanded && needsTruncation && "line-clamp-6",
        )}
      >
        {text}
      </p>
      {needsTruncation && (
        <CollapsibleTrigger
          render={
            <button type="button" className={COLLAPSE_TOGGLE_CLASS_NAME}>
              {expanded ? <ChevronUp className="size-3" /> : <ChevronRight className="size-3" />}
              <span>{expanded ? "Less" : "More"}</span>
            </button>
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
            <button type="button" className={COLLAPSE_TOGGLE_CLASS_NAME}>
              {expanded ? <ChevronUp className="size-3" /> : <ChevronRight className="size-3" />}
              <span>{expanded ? "Less" : "More"}</span>
            </button>
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
          <button
            type="button"
            className="group flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="size-3 transition-transform group-data-[panel-open]:rotate-90" />
            <span>{label}</span>
          </button>
        }
      />
      <CollapsibleContent>
        <div className="pt-1">{children}</div>
      </CollapsibleContent>
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
  const metadataEntries = Object.entries(trace.metadata);

  return (
    <div className="flex flex-col gap-5">
      {metadataEntries.length > 0 && (
        <div>
          <h3 className="mb-3">Request Metadata</h3>
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-xs">
              <tbody>
                {metadataEntries.map(([key, value]) => (
                  <tr key={key} className="border-b last:border-b-0">
                    <td className="w-1/3 px-3 py-2 font-medium text-muted-foreground">{key}</td>
                    <td className="px-3 py-2 break-all">
                      <div className="flex items-center gap-1">
                        <span className="min-w-0 flex-1">{value}</span>
                        <CopyButton value={value} className="size-5 shrink-0 p-0" />
                      </div>
                    </td>
                  </tr>
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
          <CopyButton value={value} className="size-5 shrink-0 p-0" />
        </div>
      </td>
    </tr>
  );
}
