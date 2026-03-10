import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  MessageSquare,
  Wrench,
} from "lucide-react";

import { Badge } from "@hebo/shared-ui/components/Badge";
import { CopyButton } from "@hebo/shared-ui/components/CopyButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@hebo/shared-ui/components/Tabs";

import { formatDuration, formatOperationName, formatTokenCount } from "./utils";

type TraceDetailData = {
  traceId: string;
  spanId: string;
  operationName: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: string;
  model: string;
  provider: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  finishReason?: string;
  inputMessages?: unknown;
  outputContent?: unknown;
  toolDefinitions?: unknown;
  toolCalls?: unknown;
  requestMetadata?: Record<string, string>;
  agentSlug: string;
  branchSlug: string;
  rawSpanAttributes: Record<string, unknown>;
  rawResourceAttributes: Record<string, unknown>;
};

type TraceDetailProps = {
  trace: TraceDetailData | null;
  isLoading: boolean;
};

export function TraceDetail({ trace, isLoading }: TraceDetailProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!trace) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Trace not found
      </div>
    );
  }

  const rawJson = {
    traceId: trace.traceId,
    spanId: trace.spanId,
    operationName: trace.operationName,
    startTime: trace.startTime,
    endTime: trace.endTime,
    duration: trace.duration,
    status: trace.status,
    spanAttributes: trace.rawSpanAttributes,
    resourceAttributes: trace.rawResourceAttributes,
  };

  return (
    <Tabs defaultValue="formatted">
      <TabsList variant="line" className="mb-4">
        <TabsTrigger value="formatted">Formatted</TabsTrigger>
        <TabsTrigger value="raw">Raw JSON</TabsTrigger>
      </TabsList>

      <TabsContent value="formatted" className="space-y-6">
        <OverviewSection trace={trace} />
        <InputSection messages={trace.inputMessages} />
        <OutputSection
          content={trace.outputContent}
          toolCalls={trace.toolCalls}
        />
        <UsageSection trace={trace} />
        {trace.toolDefinitions && <ToolDefinitionsSection tools={trace.toolDefinitions} />}
        {trace.requestMetadata && Object.keys(trace.requestMetadata).length > 0 && (
          <MetadataSection metadata={trace.requestMetadata} />
        )}
        <IdentifiersSection trace={trace} />
      </TabsContent>

      <TabsContent value="raw">
        <div className="relative">
          <CopyButton
            value={JSON.stringify(rawJson, null, 2)}
            className="absolute top-2 right-2 z-10"
          />
          <pre className="overflow-auto rounded-lg bg-muted p-4 text-xs leading-relaxed max-h-[70vh]">
            {JSON.stringify(rawJson, null, 2)}
          </pre>
        </div>
      </TabsContent>
    </Tabs>
  );
}

function OverviewSection({ trace }: { trace: TraceDetailData }) {
  return (
    <DetailSection title="Overview">
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <DetailField label="Operation" value={formatOperationName(trace.operationName)} />
        <DetailField label="Model" value={trace.model || "—"} />
        <DetailField label="Provider" value={trace.provider || "—"} />
        <DetailField label="Status">
          <Badge variant={trace.status === "OK" || trace.status === "STATUS_CODE_OK" ? "secondary" : "destructive"}>
            {trace.status === "STATUS_CODE_OK" ? "OK" : trace.status}
          </Badge>
        </DetailField>
        <DetailField label="Duration" value={formatDuration(trace.duration)} />
        <DetailField label="Finish Reason" value={trace.finishReason || "—"} />
      </div>
    </DetailSection>
  );
}

function InputSection({ messages }: { messages: unknown }) {
  if (!messages) return null;

  const messageList = Array.isArray(messages) ? messages : [];
  if (messageList.length === 0) return null;

  return (
    <DetailSection title="Input">
      <div className="space-y-3">
        {messageList.map((msg: { role?: string; content?: unknown }, i: number) => (
          <MessageBubble key={i} role={msg.role ?? "unknown"} content={msg.content} />
        ))}
      </div>
    </DetailSection>
  );
}

function MessageBubble({ role, content }: { role: string; content: unknown }) {
  const [expanded, setExpanded] = useState(false);

  const roleColors: Record<string, string> = {
    system: "border-l-amber-500",
    user: "border-l-blue-500",
    assistant: "border-l-green-500",
    tool: "border-l-purple-500",
  };

  const roleLabels: Record<string, string> = {
    system: "System",
    user: "User",
    assistant: "Assistant",
    tool: "Tool",
  };

  const text = typeof content === "string" ? content : JSON.stringify(content, null, 2);
  const isLong = text.length > 300;
  const displayText = isLong && !expanded ? text.slice(0, 300) + "…" : text;

  return (
    <div
      className={`border-l-3 pl-3 py-1 ${roleColors[role] ?? "border-l-gray-400"} cursor-pointer`}
      onClick={() => isLong && setExpanded(!expanded)}
    >
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {roleLabels[role] ?? role}
      </span>
      <pre className="mt-1 text-sm whitespace-pre-wrap break-words font-sans">{displayText}</pre>
      {isLong && (
        <button
          type="button"
          className="mt-1 text-xs text-primary hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

function OutputSection({
  content,
  toolCalls,
}: {
  content: unknown;
  toolCalls: unknown;
}) {
  const hasContent = content != null && content !== "";
  const hasToolCalls = Array.isArray(toolCalls) && toolCalls.length > 0;

  if (!hasContent && !hasToolCalls) return null;

  return (
    <DetailSection title="Output">
      <div className="space-y-3">
        {hasToolCalls &&
          (toolCalls as Array<{ function?: { name?: string; arguments?: string }; id?: string }>).map(
            (call, i) => <ToolCallItem key={i} call={call} />,
          )}
        {hasContent && <TextOutput content={content} />}
      </div>
    </DetailSection>
  );
}

function ToolCallItem({
  call,
}: {
  call: { function?: { name?: string; arguments?: string }; id?: string };
}) {
  const [expanded, setExpanded] = useState(false);
  const name = call.function?.name ?? "unknown";
  const argsRaw = call.function?.arguments ?? "{}";

  let argsSummary: string;
  try {
    const parsed = typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw;
    const values = Object.values(parsed);
    argsSummary = values
      .slice(0, 3)
      .map((v) => (typeof v === "string" ? `"${v.length > 30 ? v.slice(0, 30) + "…" : v}"` : JSON.stringify(v)))
      .join(", ");
    if (values.length > 3) argsSummary += ", …";
  } catch {
    argsSummary = argsRaw.length > 60 ? argsRaw.slice(0, 60) + "…" : argsRaw;
  }

  return (
    <div
      className="rounded-md bg-amber-50 dark:bg-amber-950/20 p-3 cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-2 text-sm">
        <Wrench className="h-3.5 w-3.5 text-amber-600 shrink-0" />
        <span className="font-mono font-medium">{name}</span>
        <span className="text-muted-foreground font-mono">({argsSummary})</span>
      </div>
      {expanded && (
        <pre className="mt-2 text-xs bg-background/50 rounded p-2 overflow-auto max-h-60">
          {JSON.stringify(typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw, null, 2)}
        </pre>
      )}
    </div>
  );
}

function TextOutput({ content }: { content: unknown }) {
  const [expanded, setExpanded] = useState(false);
  const text = typeof content === "string" ? content : JSON.stringify(content, null, 2);
  const isLong = text.length > 300;
  const displayText = isLong && !expanded ? text.slice(0, 300) + "…" : text;

  return (
    <div
      className="flex items-start gap-2 cursor-pointer"
      onClick={() => isLong && setExpanded(!expanded)}
    >
      <MessageSquare className="h-3.5 w-3.5 mt-1 text-green-600 shrink-0" />
      <div className="min-w-0">
        <pre className="text-sm whitespace-pre-wrap break-words font-sans">{displayText}</pre>
        {isLong && (
          <button
            type="button"
            className="mt-1 text-xs text-primary hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>
    </div>
  );
}

function UsageSection({ trace }: { trace: TraceDetailData }) {
  if (trace.inputTokens == null && trace.outputTokens == null) return null;

  return (
    <DetailSection title="Usage">
      <div className="grid grid-cols-3 gap-4 text-sm">
        {trace.inputTokens != null && (
          <div>
            <span className="text-muted-foreground">Input</span>
            <p className="font-medium">{formatTokenCount(trace.inputTokens)}</p>
          </div>
        )}
        {trace.outputTokens != null && (
          <div>
            <span className="text-muted-foreground">Output</span>
            <p className="font-medium">{formatTokenCount(trace.outputTokens)}</p>
          </div>
        )}
        {trace.totalTokens != null && (
          <div>
            <span className="text-muted-foreground">Total</span>
            <p className="font-medium">{formatTokenCount(trace.totalTokens)}</p>
          </div>
        )}
      </div>
    </DetailSection>
  );
}

function ToolDefinitionsSection({ tools }: { tools: unknown }) {
  const [expanded, setExpanded] = useState(false);
  const toolList = Array.isArray(tools) ? tools : [];
  if (toolList.length === 0) return null;

  const toolNames = toolList
    .map((t: { function?: { name?: string } }) => t.function?.name ?? "?")
    .join(", ");

  return (
    <DetailSection title="Tools">
      <div
        className="text-sm cursor-pointer flex items-center gap-2"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        <span className="text-muted-foreground">
          {toolList.length} available: {toolNames}
        </span>
      </div>
      {expanded && (
        <pre className="mt-2 text-xs bg-muted rounded-lg p-3 overflow-auto max-h-60">
          {JSON.stringify(toolList, null, 2)}
        </pre>
      )}
    </DetailSection>
  );
}

function MetadataSection({ metadata }: { metadata: Record<string, string> }) {
  return (
    <DetailSection title="Request Metadata">
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {Object.entries(metadata).map(([key, value]) => (
          <DetailField key={key} label={key} value={value} />
        ))}
      </div>
    </DetailSection>
  );
}

function IdentifiersSection({ trace }: { trace: TraceDetailData }) {
  return (
    <DetailSection title="Identifiers">
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground w-24 shrink-0">Trace ID</span>
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded truncate">{trace.traceId}</code>
          <CopyButton value={trace.traceId} className="shrink-0" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground w-24 shrink-0">Span ID</span>
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded truncate">{trace.spanId}</code>
          <CopyButton value={trace.spanId} className="shrink-0" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground w-24 shrink-0">Agent</span>
          <span>{trace.agentSlug}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground w-24 shrink-0">Branch</span>
          <span>{trace.branchSlug}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground w-24 shrink-0">Started</span>
          <span>{new Date(trace.startTime).toLocaleString()}</span>
        </div>
      </div>
    </DetailSection>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
        {title}
      </h4>
      {children}
    </div>
  );
}

function DetailField({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <span className="text-muted-foreground">{label}</span>
      <div className="font-medium">{children ?? value}</div>
    </div>
  );
}
