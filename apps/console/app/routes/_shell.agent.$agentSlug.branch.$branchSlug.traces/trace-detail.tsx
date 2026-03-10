import { ChevronDown, ChevronRight, Copy, X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@hebo/shared-ui/_shadcn/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@hebo/shared-ui/_shadcn/ui/tabs";

import { CopyButton } from "@hebo/shared-ui/components/CopyButton";

import { formatDuration, formatOperationName, formatTokens } from "./utils";

type TraceData = {
  traceId: string;
  spanId: string;
  operationName: string;
  model: string;
  provider: string;
  status: string;
  startTime: string;
  endTime: string;
  durationMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  finishReason: string | null;
  inputMessages: unknown;
  outputContent: unknown;
  toolCalls: unknown;
  toolDefinitions: unknown;
  requestMetadata: Record<string, unknown>;
  spanAttributes: Record<string, unknown>;
  resourceAttributes: Record<string, unknown>;
};

type TraceDetailProps = {
  trace: TraceData;
  onClose: () => void;
};

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        className="flex w-full items-center gap-2 py-3 text-left text-sm font-medium text-foreground hover:text-foreground/80"
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        {title}
      </button>
      {open && <div className="pb-3">{children}</div>}
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 py-1 text-sm">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-all text-foreground">{value}</span>
    </div>
  );
}

function CollapsibleText({ text, maxLength = 300 }: { text: string; maxLength?: number }) {
  const [expanded, setExpanded] = useState(false);
  if (text.length <= maxLength) return <span className="whitespace-pre-wrap">{text}</span>;
  return (
    <span className="whitespace-pre-wrap">
      {expanded ? text : `${text.slice(0, maxLength)}…`}
      <button
        type="button"
        className="ml-1 text-xs text-primary hover:underline"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "Show less" : "Show more"}
      </button>
    </span>
  );
}

function MessageBubble({ role, content }: { role: string; content: string }) {
  const roleColors: Record<string, string> = {
    system: "border-l-muted-foreground/40 bg-muted/30",
    user: "border-l-primary/60 bg-primary/5",
    assistant: "border-l-green-500/60 bg-green-500/5",
    tool: "border-l-amber-500/60 bg-amber-500/5",
  };
  const color = roleColors[role] ?? "border-l-border bg-muted/20";
  return (
    <div className={`rounded-r-md border-l-2 px-3 py-2 ${color}`}>
      <div className="mb-1">
        <Badge variant="outline" className="text-[10px] font-medium uppercase">
          {role}
        </Badge>
      </div>
      <div className="text-sm">
        <CollapsibleText text={content} />
      </div>
    </div>
  );
}

function InputMessages({ messages }: { messages: unknown }) {
  if (!messages) return <span className="text-sm text-muted-foreground">No input data</span>;

  let parsed: Array<{ role: string; content: string }> = [];
  if (typeof messages === "string") {
    try {
      parsed = JSON.parse(messages);
    } catch {
      return <CollapsibleText text={messages} />;
    }
  } else if (Array.isArray(messages)) {
    parsed = messages;
  } else {
    return <CollapsibleText text={JSON.stringify(messages, null, 2)} />;
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return <span className="text-sm text-muted-foreground">No input messages</span>;
  }

  return (
    <div className="flex flex-col gap-2">
      {parsed.map((msg, i) => {
        const content =
          typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content, null, 2);
        return <MessageBubble key={i} role={msg.role ?? "unknown"} content={content} />;
      })}
    </div>
  );
}

function OutputSection({ trace }: { trace: TraceData }) {
  const toolCalls = parseJson(trace.toolCalls);
  const hasToolCalls = Array.isArray(toolCalls) && toolCalls.length > 0;
  const hasText = trace.outputContent != null && trace.outputContent !== "";

  if (!hasToolCalls && !hasText) {
    return <span className="text-sm text-muted-foreground">No output data</span>;
  }

  return (
    <div className="flex flex-col gap-2">
      {hasToolCalls &&
        toolCalls.map((call: Record<string, unknown>, i: number) => {
          const name = (call.function as Record<string, unknown>)?.name ?? call.name ?? "unknown";
          const args = (call.function as Record<string, unknown>)?.arguments ?? call.arguments;
          const argsStr = typeof args === "string" ? args : JSON.stringify(args, null, 2);
          return (
            <div key={i} className="rounded-r-md border-l-2 border-l-amber-500/60 bg-amber-500/5 px-3 py-2">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <span>🔧</span>
                <span>{String(name)}</span>
              </div>
              <pre className="mt-1 overflow-x-auto text-xs text-muted-foreground">
                <CollapsibleText text={argsStr ?? ""} maxLength={200} />
              </pre>
            </div>
          );
        })}
      {hasText && (
        <div className="rounded-r-md border-l-2 border-l-green-500/60 bg-green-500/5 px-3 py-2">
          <div className="mb-1">
            <Badge variant="outline" className="text-[10px] font-medium uppercase">
              assistant
            </Badge>
          </div>
          <div className="text-sm">
            <CollapsibleText
              text={
                typeof trace.outputContent === "string"
                  ? trace.outputContent
                  : JSON.stringify(trace.outputContent, null, 2)
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ToolDefinitions({ tools }: { tools: unknown }) {
  const parsed = parseJson(tools);
  if (!Array.isArray(parsed) || parsed.length === 0) return null;
  return (
    <div className="text-sm text-muted-foreground">
      {parsed.map((tool: Record<string, unknown>, i: number) => {
        const fn = tool.function as Record<string, unknown> | undefined;
        const name = fn?.name ?? tool.name ?? "unknown";
        return (
          <div key={i} className="py-0.5">
            <span className="font-mono text-xs">{String(name)}</span>
          </div>
        );
      })}
    </div>
  );
}

function parseJson(val: unknown): unknown {
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
}

export function TraceDetail({ trace, onClose }: TraceDetailProps) {
  const toolDefs = parseJson(trace.toolDefinitions);
  const hasToolDefs = Array.isArray(toolDefs) && toolDefs.length > 0;
  const metaEntries = Object.entries(trace.requestMetadata);

  const rawJson = {
    traceId: trace.traceId,
    spanId: trace.spanId,
    operationName: trace.operationName,
    startTime: trace.startTime,
    endTime: trace.endTime,
    durationMs: trace.durationMs,
    status: trace.status,
    spanAttributes: trace.spanAttributes,
    resourceAttributes: trace.resourceAttributes,
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h3 className="text-sm font-medium">{formatOperationName(trace.operationName)}</h3>
          <p className="text-xs text-muted-foreground">
            {trace.model} · {formatDuration(trace.durationMs)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 hover:bg-muted"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Tabs defaultValue="formatted">
          <TabsList variant="line" className="w-full justify-start px-4 pt-2">
            <TabsTrigger value="formatted">Formatted</TabsTrigger>
            <TabsTrigger value="raw">Raw JSON</TabsTrigger>
          </TabsList>

          <TabsContent value="formatted" className="px-4">
            <Section title="Overview">
              <FieldRow label="Operation" value={formatOperationName(trace.operationName)} />
              <FieldRow label="Model" value={trace.model || "—"} />
              <FieldRow label="Provider" value={String(trace.provider || "—")} />
              <FieldRow label="Duration" value={formatDuration(trace.durationMs)} />
              <FieldRow
                label="Status"
                value={
                  <Badge variant={trace.status === "ok" ? "secondary" : "destructive"}>
                    {trace.status}
                  </Badge>
                }
              />
              {trace.finishReason && (
                <FieldRow label="Finish reason" value={String(trace.finishReason)} />
              )}
              {hasToolDefs && (
                <FieldRow
                  label="Tools"
                  value={
                    <span className="text-muted-foreground">
                      {(toolDefs as unknown[]).length} available
                    </span>
                  }
                />
              )}
            </Section>

            <Section title="Input">
              <InputMessages messages={trace.inputMessages} />
            </Section>

            <Section title="Output">
              <OutputSection trace={trace} />
            </Section>

            <Section title="Usage">
              <FieldRow label="Input tokens" value={formatTokens(trace.inputTokens)} />
              <FieldRow label="Output tokens" value={formatTokens(trace.outputTokens)} />
              <FieldRow label="Total tokens" value={formatTokens(trace.totalTokens)} />
            </Section>

            {metaEntries.length > 0 && (
              <Section title="Request Metadata">
                {metaEntries.map(([key, value]) => (
                  <FieldRow key={key} label={key} value={String(value)} />
                ))}
              </Section>
            )}

            {hasToolDefs && (
              <Section title="Tool Definitions" defaultOpen={false}>
                <ToolDefinitions tools={trace.toolDefinitions} />
              </Section>
            )}

            <Section title="Identifiers" defaultOpen={false}>
              <FieldRow
                label="Trace ID"
                value={
                  <span className="flex items-center gap-1 font-mono text-xs">
                    {trace.traceId}
                    <CopyButton value={trace.traceId} />
                  </span>
                }
              />
              <FieldRow
                label="Span ID"
                value={<span className="font-mono text-xs">{trace.spanId}</span>}
              />
              <FieldRow
                label="Time"
                value={new Date(trace.startTime).toLocaleString()}
              />
            </Section>
          </TabsContent>

          <TabsContent value="raw" className="px-4 py-3">
            <div className="relative">
              <CopyButton
                value={JSON.stringify(rawJson, null, 2)}
                className="absolute top-2 right-2"
              />
              <pre className="max-h-[70vh] overflow-auto rounded-md bg-muted/50 p-3 text-xs">
                {JSON.stringify(rawJson, null, 2)}
              </pre>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
