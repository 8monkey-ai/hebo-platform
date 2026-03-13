import { ChevronDown, ChevronRight, Loader2, Wrench } from "lucide-react";
import { useRef, useState } from "react";

import { Badge } from "@hebo/shared-ui/components/Badge";
import { CopyButton } from "@hebo/shared-ui/components/CopyButton";
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
  "mt-3 inline-flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase transition-colors hover:bg-muted hover:text-foreground";
const CODE_BLOCK_CLASS_NAME =
  "overflow-x-auto rounded-md border bg-muted/30 p-3 text-xs break-words whitespace-pre-wrap text-foreground";

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

  const toolCallCount = trace.outputMessages.reduce(
    (count, message) => count + extractMessageParts(message).toolCalls.length,
    0,
  );
  const statusBadge = getTraceStatusBadgeProps(trace.status);

  return (
    <DetailShell>
      <Tabs defaultValue="formatted" className="flex min-h-0 flex-1 flex-col">
        <div className="border-b px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2>{trace.responseModel}</h2>
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
              <Badge variant="secondary">{formatDuration(trace.durationMs)}</Badge>
              <Badge variant={statusBadge.variant} className={statusBadge.className}>
                {trace.status}
              </Badge>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
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

        <TabsContent value="formatted" className="min-h-0 overflow-y-auto px-4 py-4">
          <FormattedView trace={trace} />
        </TabsContent>

        <TabsContent value="raw" className="min-h-0 overflow-y-auto px-4 py-4">
          <RawJsonView trace={trace} />
        </TabsContent>

        <TabsContent value="metadata" className="min-h-0 overflow-y-auto px-4 py-4">
          <MetadataView trace={trace} />
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
        <MessageBlock key={`in:${index}`} message={msg} />
      ))}

      {outputMessages.map((msg, index) => (
        <MessageBlock key={`out:${index}`} message={msg} />
      ))}

      {inputMessages.length === 0 && outputMessages.length === 0 && (
        <p className="text-sm text-muted-foreground">No message content available.</p>
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

          {toolCalls.map((tc) => (
            <div key={`${tc.name}:${tc.arguments}`} className="space-y-2">
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
  const displayText = needsTruncation && !expanded ? `${text.slice(0, maxLength)}...` : text;

  return (
    <div>
      <p className="text-xs leading-4 break-words whitespace-pre-wrap">{displayText}</p>
      {needsTruncation && (
        <button
          type="button"
          className={COLLAPSE_TOGGLE_CLASS_NAME}
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
      <pre className={CODE_BLOCK_CLASS_NAME}>{displayCode}</pre>
      {needsTruncation && (
        <button
          type="button"
          className={COLLAPSE_TOGGLE_CLASS_NAME}
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
