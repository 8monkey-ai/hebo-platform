import { ChevronDown, ChevronRight, Copy, Wrench, X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@hebo/shared-ui/components/Badge";
import { Button } from "@hebo/shared-ui/components/Button";
import { CodeBlock } from "@hebo/shared-ui/components/Code";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@hebo/shared-ui/components/Tabs";

import { formatDuration, formatTokenCount, formatToolCallSignature, truncateText } from "./utils";

type TraceDetailData = {
  traceId: string;
  spanId: string;
  operationName: string;
  startTime: string;
  endTime: string;
  durationMs: number;
  status: string;
  model?: string;
  provider?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  finishReason?: string;
  inputMessages?: unknown;
  outputContent?: unknown;
  tools?: unknown;
  toolCalls?: unknown;
  requestMetadata?: Record<string, string>;
  agentSlug?: string;
  branchSlug?: string;
  rawAttributes: Record<string, unknown>;
};

type TraceDetailProps = {
  trace: TraceDetailData;
  onClose: () => void;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex items-baseline justify-between gap-4 py-0.5">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm break-all">{value}</span>
    </div>
  );
}

function CopyableField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-0.5">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1 text-right font-mono text-xs break-all">
        {value}
        <button
          type="button"
          className="inline-flex shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => navigator.clipboard.writeText(value)}
          aria-label={`Copy ${label}`}
        >
          <Copy className="size-3" />
        </button>
      </span>
    </div>
  );
}

function CollapsibleContent({ content, maxLength = 500 }: { content: string; maxLength?: number }) {
  const [expanded, setExpanded] = useState(false);
  const needsTruncation = content.length > maxLength;

  return (
    <div className="rounded-md bg-muted p-3">
      <pre className="text-sm whitespace-pre-wrap break-words">
        {needsTruncation && !expanded ? truncateText(content, maxLength) : content}
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

function ToolCallsSection({ toolCalls }: { toolCalls: unknown }) {
  if (!toolCalls) return null;
  const calls = Array.isArray(toolCalls) ? toolCalls : [toolCalls];
  if (calls.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {calls.map((call, i) => {
        const name = call?.function?.name ?? call?.name ?? `tool_${i}`;
        const args = call?.function?.arguments ?? call?.arguments;
        const result = call?.result;
        const parsedArgs = typeof args === "string" ? (() => { try { return JSON.parse(args); } catch { return args; } })() : args;

        return (
          <ToolCallItem key={i} name={name} args={parsedArgs} result={result} />
        );
      })}
    </div>
  );
}

function ToolCallItem({ name, args, result }: { name: string; args: unknown; result?: unknown }) {
  const [expanded, setExpanded] = useState(false);
  const signature = formatToolCallSignature(name, args);

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-sm hover:bg-muted/50"
        onClick={() => setExpanded(!expanded)}
      >
        <Wrench className="size-3.5 shrink-0 text-amber-600" />
        <span className="font-mono text-xs">{signature}</span>
        {expanded ? (
          <ChevronDown className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
        )}
      </button>
      {expanded && args && (
        <div className="ml-6">
          <CollapsibleContent content={JSON.stringify(args, null, 2)} maxLength={300} />
        </div>
      )}
      {result && (
        <div className="ml-6 flex items-start gap-1.5">
          <span className="shrink-0 text-sm text-muted-foreground">-&gt;</span>
          <CollapsibleContent
            content={typeof result === "string" ? result : JSON.stringify(result, null, 2)}
            maxLength={200}
          />
        </div>
      )}
    </div>
  );
}

function ToolDefinitions({ tools }: { tools: unknown }) {
  const [expanded, setExpanded] = useState(false);
  if (!tools) return null;
  const toolList = Array.isArray(tools) ? tools : [tools];
  if (toolList.length === 0) return null;

  return (
    <div className="py-0.5">
      <button
        type="button"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        {toolList.length} tool{toolList.length !== 1 ? "s" : ""} available
      </button>
      {expanded && (
        <div className="mt-1 ml-5 space-y-0.5">
          {toolList.map((tool, i) => {
            const name = tool?.function?.name ?? tool?.name ?? `tool_${i}`;
            const params = tool?.function?.parameters?.properties ?? {};
            const paramNames = Object.keys(params);
            const required = new Set(tool?.function?.parameters?.required ?? []);
            const sig = paramNames
              .map((p) => (required.has(p) ? p : `${p}?`))
              .join(", ");
            return (
              <div key={i} className="font-mono text-xs text-muted-foreground">
                {name}({sig})
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InputSection({ messages }: { messages: unknown }) {
  if (!messages) return null;

  const msgArray = Array.isArray(messages) ? messages : [messages];
  if (msgArray.length === 0) return null;

  return (
    <div className="space-y-2">
      {msgArray.map((msg, i) => {
        const role = msg?.role ?? "unknown";
        const content = msg?.content ?? (typeof msg === "string" ? msg : JSON.stringify(msg));
        const contentStr = typeof content === "string" ? content : JSON.stringify(content, null, 2);

        return (
          <div key={i} className="space-y-1">
            <Badge variant="outline" className="text-xs capitalize">
              {role}
            </Badge>
            <CollapsibleContent content={contentStr} />
          </div>
        );
      })}
    </div>
  );
}

export function TraceDetailPanel({ trace, onClose }: TraceDetailProps) {
  const isOk = trace.status === "OK" || trace.status === "UNSET" || trace.status === "0";
  const hasMetadata =
    trace.requestMetadata && Object.keys(trace.requestMetadata).length > 0;

  return (
    <div className="flex h-full flex-col border-t lg:border-t-0 lg:border-l">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Trace Detail</h3>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close detail">
          <X className="size-4" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="formatted" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-4 mt-2 w-fit">
          <TabsTrigger value="formatted">Formatted</TabsTrigger>
          <TabsTrigger value="raw">Raw JSON</TabsTrigger>
        </TabsList>

        <TabsContent value="formatted" className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="space-y-5 pt-2">
            {/* Request */}
            <Section title="Request">
              <div className="space-y-0.5">
                <Field label="Operation" value={trace.operationName} />
                <Field label="Model" value={trace.model} />
                <Field label="Provider" value={trace.provider} />
                <ToolDefinitions tools={trace.tools} />
              </div>
            </Section>

            {/* Input */}
            {trace.inputMessages && (
              <Section title="Input">
                <InputSection messages={trace.inputMessages} />
              </Section>
            )}

            {/* Usage */}
            {(trace.inputTokens !== undefined || trace.outputTokens !== undefined) && (
              <Section title="Usage">
                <div className="space-y-0.5">
                  {trace.inputTokens !== undefined && (
                    <Field label="Input tokens" value={formatTokenCount(trace.inputTokens)} />
                  )}
                  {trace.outputTokens !== undefined && (
                    <Field label="Output tokens" value={formatTokenCount(trace.outputTokens)} />
                  )}
                  {trace.totalTokens !== undefined && (
                    <Field label="Total tokens" value={formatTokenCount(trace.totalTokens)} />
                  )}
                </div>
              </Section>
            )}

            {/* Output */}
            <Section title="Output">
              {trace.toolCalls ? (
                <ToolCallsSection toolCalls={trace.toolCalls} />
              ) : trace.outputContent ? (
                <CollapsibleContent
                  content={
                    typeof trace.outputContent === "string"
                      ? trace.outputContent
                      : JSON.stringify(trace.outputContent, null, 2)
                  }
                />
              ) : (
                <p className="text-sm text-muted-foreground">No output content</p>
              )}
            </Section>

            {/* Identifiers */}
            <Section title="Identifiers">
              <div className="space-y-0.5">
                <CopyableField label="Trace ID" value={trace.traceId} />
                <CopyableField label="Span ID" value={trace.spanId} />
                <Field label="Duration" value={formatDuration(trace.durationMs)} />
                <Field
                  label="Status"
                  value={
                    <Badge
                      variant="outline"
                      className={
                        isOk
                          ? "border-emerald-600 text-emerald-600"
                          : "border-destructive text-destructive"
                      }
                    >
                      {isOk ? "OK" : trace.status}
                    </Badge>
                  }
                />
                <Field label="Finish reason" value={trace.finishReason} />
                <Field label="Agent" value={trace.agentSlug} />
                <Field label="Branch" value={trace.branchSlug} />
              </div>
            </Section>

            {/* Request Metadata */}
            {hasMetadata && (
              <Section title="Request Metadata">
                <div className="space-y-0.5">
                  {Object.entries(trace.requestMetadata!).map(([key, value]) => (
                    <Field key={key} label={key} value={value} />
                  ))}
                </div>
              </Section>
            )}
          </div>
        </TabsContent>

        <TabsContent value="raw" className="flex-1 overflow-y-auto px-4 pb-4 pt-2">
          <CodeBlock title="Span Attributes">
            {JSON.stringify(trace.rawAttributes, null, 2)}
          </CodeBlock>
        </TabsContent>
      </Tabs>
    </div>
  );
}
