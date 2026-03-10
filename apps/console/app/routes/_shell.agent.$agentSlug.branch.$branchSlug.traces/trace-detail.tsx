import { ChevronDown, Wrench } from "lucide-react";
import { useState } from "react";

import { Badge } from "@hebo/shared-ui/components/Badge";
import { CodeBlock } from "@hebo/shared-ui/components/Code";
import { CopyButton } from "@hebo/shared-ui/components/CopyButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@hebo/shared-ui/components/Tabs";

import { formatDuration, formatTokens, truncateText } from "./utils";

type TraceDetailData = {
  traceId: string;
  spanId: string;
  operationName: string;
  startTime: string;
  endTime: string;
  durationMs: number;
  status: string;
  model: string;
  provider: string;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  finishReason: string;
  input: unknown;
  output: unknown;
  toolCalls: unknown;
  toolDefinitions: unknown;
  requestMetadata: Record<string, string>;
  raw: unknown;
};

type TraceDetailProps = {
  trace: TraceDetailData;
  onClose: () => void;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
        {title}
      </h4>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <span className="text-muted-foreground shrink-0 text-sm">{label}</span>
      <span className="text-sm break-all text-right">{value}</span>
    </div>
  );
}

function CollapsibleContent({ content, maxLen = 500 }: { content: string; maxLen?: number }) {
  const [expanded, setExpanded] = useState(false);
  const { text, truncated } = truncateText(content, maxLen);

  return (
    <div>
      <pre className="whitespace-pre-wrap text-sm bg-accent/50 rounded-md p-3 overflow-auto max-h-96">
        <code>{expanded ? content : text}{truncated && !expanded && "..."}</code>
      </pre>
      {truncated && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-primary mt-1 flex items-center gap-1 text-xs hover:underline"
        >
          <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

function ToolCallsSection({ toolCalls, toolDefinitions }: { toolCalls: unknown; toolDefinitions: unknown }) {
  const calls = Array.isArray(toolCalls) ? toolCalls : toolCalls ? [toolCalls] : [];
  const defs = Array.isArray(toolDefinitions) ? toolDefinitions : [];
  const [showDefs, setShowDefs] = useState(false);

  if (calls.length === 0 && defs.length === 0) return null;

  return (
    <Section title="Tool Calls">
      <div className="space-y-2">
        {calls.map((call: Record<string, unknown>, i: number) => {
          const name = call.function?.name ?? call.name ?? `tool_call_${i}`;
          const args = call.function?.arguments ?? call.arguments;
          const result = call.result;
          const argsStr = typeof args === "string" ? args : JSON.stringify(args, null, 2);

          return (
            <div key={i} className="rounded-md border p-2 space-y-1">
              <div className="flex items-center gap-1.5">
                <Wrench className="h-3.5 w-3.5 text-amber-500" />
                <span className="font-mono text-sm font-medium">{String(name)}</span>
              </div>
              {argsStr && (
                <pre className="whitespace-pre-wrap text-xs bg-accent/50 rounded p-2 overflow-auto max-h-48">
                  <code>{argsStr}</code>
                </pre>
              )}
              {result != null && (
                <div className="text-muted-foreground mt-1">
                  <span className="text-xs">Result:</span>
                  <pre className="whitespace-pre-wrap text-xs bg-accent/50 rounded p-2 overflow-auto max-h-48 mt-0.5">
                    <code>{typeof result === "string" ? result : JSON.stringify(result, null, 2)}</code>
                  </pre>
                </div>
              )}
            </div>
          );
        })}

        {defs.length > 0 && (
          <button
            type="button"
            onClick={() => setShowDefs(!showDefs)}
            className="text-muted-foreground text-xs hover:underline"
          >
            {showDefs ? "Hide" : "Show"} {defs.length} tool definition{defs.length > 1 ? "s" : ""}
          </button>
        )}
        {showDefs && (
          <pre className="whitespace-pre-wrap text-xs bg-accent/50 rounded-md p-2 overflow-auto max-h-64">
            <code>{JSON.stringify(defs, null, 2)}</code>
          </pre>
        )}
      </div>
    </Section>
  );
}

export function TraceDetail({ trace, onClose }: TraceDetailProps) {
  const inputStr = trace.input != null
    ? typeof trace.input === "string" ? trace.input : JSON.stringify(trace.input, null, 2)
    : null;
  const outputStr = trace.output != null
    ? typeof trace.output === "string" ? trace.output : JSON.stringify(trace.output, null, 2)
    : null;

  const metadataEntries = Object.entries(trace.requestMetadata ?? {});

  return (
    <div className="border-t pt-4 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Trace Detail</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          Close
        </button>
      </div>

      <Tabs defaultValue="formatted">
        <TabsList>
          <TabsTrigger value="formatted">Formatted</TabsTrigger>
          <TabsTrigger value="raw">Raw JSON</TabsTrigger>
        </TabsList>

        <TabsContent value="formatted" className="space-y-6 pt-4">
          <Section title="Request">
            <Field label="Operation" value={trace.operationName} />
            <Field label="Model" value={trace.model} />
            <Field label="Provider" value={trace.provider} />
          </Section>

          {inputStr && (
            <Section title="Input">
              <CollapsibleContent content={inputStr} />
            </Section>
          )}

          <Section title="Usage">
            <Field label="Input tokens" value={formatTokens(trace.inputTokens)} />
            <Field label="Output tokens" value={formatTokens(trace.outputTokens)} />
            <Field label="Total tokens" value={formatTokens(trace.totalTokens)} />
          </Section>

          {outputStr && (
            <Section title="Output">
              <CollapsibleContent content={outputStr} />
            </Section>
          )}

          <ToolCallsSection toolCalls={trace.toolCalls} toolDefinitions={trace.toolDefinitions} />

          <Section title="Identifiers">
            <Field
              label="Trace ID"
              value={
                <span className="flex items-center gap-1">
                  <code className="text-xs">{trace.traceId}</code>
                  <CopyButton value={trace.traceId} />
                </span>
              }
            />
            <Field
              label="Span ID"
              value={
                <span className="flex items-center gap-1">
                  <code className="text-xs">{trace.spanId}</code>
                  <CopyButton value={trace.spanId} />
                </span>
              }
            />
            <Field label="Duration" value={formatDuration(trace.durationMs)} />
            <Field label="Status" value={<Badge variant={trace.status === "OK" ? "default" : "destructive"}>{trace.status}</Badge>} />
            <Field label="Finish reason" value={trace.finishReason} />
          </Section>

          {metadataEntries.length > 0 && (
            <Section title="Request Metadata">
              {metadataEntries.map(([key, value]) => (
                <Field key={key} label={key} value={value} />
              ))}
            </Section>
          )}
        </TabsContent>

        <TabsContent value="raw" className="pt-4">
          <CodeBlock title="Raw Span Data">
            {JSON.stringify(trace.raw, null, 2)}
          </CodeBlock>
        </TabsContent>
      </Tabs>
    </div>
  );
}
