import { ChevronDown, ChevronRight, Loader2, Wrench, X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@hebo/shared-ui/components/Badge";
import { Button } from "@hebo/shared-ui/components/Button";
import { CopyButton } from "@hebo/shared-ui/components/CopyButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@hebo/shared-ui/components/Tabs";

import {
  formatDuration,
  formatOperationName,
  formatStatus,
  formatTimestampFull,
  formatTokenCount,
} from "./utils";

type TraceDetailData = {
  timestamp: string;
  timestampEnd: string;
  traceId: string;
  spanId: string;
  spanName: string;
  operationName: string;
  model: string;
  responseModel: string;
  provider: string;
  status: string;
  statusMessage: string;
  durationMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  reasoningTokens: number | null;
  inputMessages: unknown;
  outputMessages: unknown;
  finishReasons: unknown;
  responseId: string;
  metadata: Record<string, string>;
  spanAttributes: Record<string, unknown>;
  resourceAttributes: Record<string, unknown>;
};

type TraceDetailProps = {
  trace: TraceDetailData | null;
  loading: boolean;
  onClose: () => void;
};

export function TraceDetail({ trace, loading, onClose }: TraceDetailProps) {
  if (loading) {
    return (
      <DetailShell onClose={onClose}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </DetailShell>
    );
  }

  if (!trace) {
    return (
      <DetailShell onClose={onClose}>
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
          Select a trace to view details
        </div>
      </DetailShell>
    );
  }

  const status = formatStatus(trace.status);
  const toolCallCount = countToolCalls(trace.outputMessages);

  return (
    <DetailShell onClose={onClose}>
      {/* Header */}
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="truncate text-lg font-semibold">
            {formatOperationName(trace.operationName)}
          </h2>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="outline">{formatDuration(trace.durationMs)}</Badge>
            <Badge variant={status === "error" ? "destructive" : "secondary"}>{status}</Badge>
          </div>
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {trace.model} &middot; {formatTimestampFull(trace.timestamp)} &middot; trace{" "}
          {trace.traceId.slice(0, 16)}
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="formatted" className="flex min-h-0 flex-1 flex-col">
        <div className="border-b px-4">
          <TabsList className="bg-transparent">
            <TabsTrigger value="formatted">Formatted</TabsTrigger>
            <TabsTrigger value="raw">Raw JSON</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
          </TabsList>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 border-b px-4 py-2 text-xs text-muted-foreground">
          {trace.inputTokens !== null && <span>{formatTokenCount(trace.inputTokens)} in</span>}
          {trace.outputTokens !== null && <span>{formatTokenCount(trace.outputTokens)} out</span>}
          {trace.reasoningTokens !== null && trace.reasoningTokens > 0 && (
            <span>{formatTokenCount(trace.reasoningTokens)} reasoning</span>
          )}
          {toolCallCount > 0 && (
            <span>
              {toolCallCount} tool call{toolCallCount > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Formatted tab */}
        <TabsContent value="formatted" className="mt-0 flex-1 overflow-y-auto p-4">
          <FormattedView trace={trace} />
        </TabsContent>

        {/* Raw JSON tab */}
        <TabsContent value="raw" className="mt-0 flex-1 overflow-y-auto p-4">
          <RawJsonView trace={trace} />
        </TabsContent>

        {/* Metadata tab */}
        <TabsContent value="metadata" className="mt-0 flex-1 overflow-y-auto p-4">
          <MetadataView trace={trace} />
        </TabsContent>
      </Tabs>
    </DetailShell>
  );
}

function DetailShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="flex h-full flex-col border-l">
      <div className="flex items-center justify-end border-b px-2 py-1">
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>
      {children}
    </div>
  );
}

// --- Formatted View ---

function FormattedView({ trace }: { trace: TraceDetailData }) {
  const inputMessages = normalizeMessages(trace.inputMessages);
  const outputMessages = normalizeMessages(trace.outputMessages);

  return (
    <div className="flex flex-col gap-4">
      {/* Input messages */}
      {inputMessages.map((msg, i) => (
        <MessageBlock key={`in-${i}`} message={msg} />
      ))}

      {/* Output messages */}
      {outputMessages.map((msg, i) => (
        <MessageBlock key={`out-${i}`} message={msg} />
      ))}

      {/* If no messages, show a note */}
      {inputMessages.length === 0 && outputMessages.length === 0 && (
        <p className="text-sm text-muted-foreground">No message content available.</p>
      )}
    </div>
  );
}

type NormalizedMessage = {
  role: string;
  content: string;
  toolCalls?: Array<{ name: string; arguments: string }>;
  toolName?: string;
  reasoning?: string;
};

function normalizeMessages(messages: unknown): NormalizedMessage[] {
  if (!messages || !Array.isArray(messages)) return [];
  return messages.map((msg) => {
    if (typeof msg === "string") return { role: "unknown", content: msg };
    const role = String(msg.role ?? "unknown");
    let content = "";
    let reasoning: string | undefined;
    let toolCalls: Array<{ name: string; arguments: string }> | undefined;
    let toolName: string | undefined;

    if (typeof msg.content === "string") {
      content = msg.content;
    } else if (Array.isArray(msg.content)) {
      // Multi-part content (text + tool use etc)
      const textParts: string[] = [];
      for (const part of msg.content) {
        if (part.type === "text" && typeof part.text === "string") {
          textParts.push(part.text);
        } else if (part.type === "reasoning" && typeof part.text === "string") {
          reasoning = part.text;
        }
      }
      content = textParts.join("\n");
    }

    // Tool calls in the message
    if (Array.isArray(msg.tool_calls)) {
      toolCalls = msg.tool_calls.map((tc: any) => ({
        name: tc.function?.name ?? tc.name ?? "unknown",
        arguments:
          typeof tc.function?.arguments === "string"
            ? tc.function.arguments
            : JSON.stringify(tc.function?.arguments ?? tc.arguments ?? {}, null, 2),
      }));
    }

    // Tool result message
    if (role === "tool" && msg.name) {
      toolName = String(msg.name);
    }

    return { role, content, toolCalls, toolName, reasoning };
  });
}

function MessageBlock({ message }: { message: NormalizedMessage }) {
  const roleColors: Record<string, string> = {
    system: "border-l-amber-500",
    user: "border-l-blue-500",
    assistant: "border-l-green-500",
    tool: "border-l-purple-500",
  };

  const borderColor = roleColors[message.role] ?? "border-l-gray-400";
  const roleLabel = message.role.charAt(0).toUpperCase() + message.role.slice(1);
  const fullContent = buildFullContent(message);

  return (
    <div className={`border-l-2 ${borderColor} pl-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{roleLabel}</span>
          {message.toolName && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Wrench className="size-3" />
              {message.toolName}
            </Badge>
          )}
        </div>
        {fullContent && <CopyButton value={fullContent} className="size-6" />}
      </div>

      {/* Reasoning */}
      {message.reasoning && (
        <ExpandableContent label="Reasoning" className="mt-2">
          <p className="text-sm whitespace-pre-wrap text-muted-foreground italic">
            {message.reasoning}
          </p>
        </ExpandableContent>
      )}

      {/* Main content */}
      {message.content && (
        <CollapsibleText text={message.content} maxLength={500} className="mt-1" />
      )}

      {/* Tool calls */}
      {message.toolCalls?.map((tc, i) => (
        <div key={i} className="mt-2">
          <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Wrench className="size-3" />
            <span className="font-medium">{tc.name}</span>
          </div>
          <CollapsibleCode code={tc.arguments} maxLength={300} />
        </div>
      ))}
    </div>
  );
}

function buildFullContent(message: NormalizedMessage): string {
  const parts: string[] = [];
  if (message.reasoning) parts.push(`[Reasoning]\n${message.reasoning}`);
  if (message.content) parts.push(message.content);
  if (message.toolCalls) {
    for (const tc of message.toolCalls) {
      parts.push(`[Tool Call: ${tc.name}]\n${tc.arguments}`);
    }
  }
  return parts.join("\n\n");
}

function CollapsibleText({
  text,
  maxLength,
  className = "",
}: {
  text: string;
  maxLength: number;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const needsTruncation = text.length > maxLength;
  const displayText = needsTruncation && !expanded ? `${text.slice(0, maxLength)}...` : text;

  return (
    <div className={className}>
      <p className="text-sm break-words whitespace-pre-wrap">{displayText}</p>
      {needsTruncation && (
        <button
          type="button"
          className="mt-1 text-xs text-primary hover:underline"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Show less" : "Show more"}
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
      <pre className="overflow-x-auto rounded-md bg-muted p-2 text-xs break-words whitespace-pre-wrap">
        {displayCode}
      </pre>
      {needsTruncation && (
        <button
          type="button"
          className="mt-1 text-xs text-primary hover:underline"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

function ExpandableContent({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={className}>
      <button
        type="button"
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
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
  const rawData = {
    traceId: trace.traceId,
    spanId: trace.spanId,
    spanName: trace.spanName,
    timestamp: trace.timestamp,
    timestampEnd: trace.timestampEnd,
    durationMs: trace.durationMs,
    status: trace.status,
    statusMessage: trace.statusMessage,
    spanAttributes: trace.spanAttributes,
    resourceAttributes: trace.resourceAttributes,
  };

  const jsonStr = JSON.stringify(rawData, null, 2);

  return (
    <div className="relative">
      <CopyButton value={jsonStr} className="absolute top-2 right-2" />
      <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs break-words whitespace-pre-wrap">
        {jsonStr}
      </pre>
    </div>
  );
}

// --- Metadata View ---

function MetadataView({ trace }: { trace: TraceDetailData }) {
  const metadataEntries = Object.entries(trace.metadata);

  return (
    <div className="flex flex-col gap-6">
      {/* Request Metadata */}
      {metadataEntries.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium">Request Metadata</h3>
          <div className="rounded-md border">
            <table className="w-full text-sm">
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

      {/* Identifiers */}
      <div>
        <h3 className="mb-2 text-sm font-medium">Identifiers</h3>
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <tbody>
              <IdentifierRow label="Trace ID" value={trace.traceId} />
              <IdentifierRow label="Span ID" value={trace.spanId} />
              <IdentifierRow label="Response ID" value={trace.responseId} />
              <IdentifierRow label="Model" value={trace.model} />
              <IdentifierRow label="Response Model" value={trace.responseModel} />
              <IdentifierRow label="Provider" value={trace.provider} />
              <IdentifierRow label="Duration" value={formatDuration(trace.durationMs)} />
              <IdentifierRow
                label="Finish Reasons"
                value={
                  Array.isArray(trace.finishReasons)
                    ? trace.finishReasons.join(", ")
                    : String(trace.finishReasons ?? "-")
                }
              />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function IdentifierRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <tr className="border-b last:border-b-0">
      <td className="w-1/3 px-3 py-2 font-medium text-muted-foreground">{label}</td>
      <td className="px-3 py-2 font-mono text-xs break-all">
        <div className="flex items-center gap-1">
          <span className="truncate">{value}</span>
          <CopyButton value={value} className="size-5 shrink-0" />
        </div>
      </td>
    </tr>
  );
}

// --- Helpers ---

function countToolCalls(outputMessages: unknown): number {
  if (!outputMessages || !Array.isArray(outputMessages)) return 0;
  let count = 0;
  for (const msg of outputMessages) {
    if (Array.isArray(msg?.tool_calls)) {
      count += msg.tool_calls.length;
    }
  }
  return count;
}
