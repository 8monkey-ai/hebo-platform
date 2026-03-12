import { useEffect, useState } from "react";
import { useParams } from "react-router";

import { api } from "~console/lib/service";

import { TraceDetail } from "./trace-detail";
import { TraceListPanel } from "./trace-list-panel";

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

export default function TracesRoute() {
  const params = useParams();
  const agentSlug = params.agentSlug!;
  const branchSlug = params.branchSlug!;

  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [traceDetail, setTraceDetail] = useState<TraceDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!selectedTraceId) {
      setTraceDetail(null);
      return;
    }

    let cancelled = false;

    setDetailLoading(true);

    (async () => {
      try {
        const { data, error } = await api
          .agents({ agentSlug })
          .branches({ branchSlug })
          .traces({ traceId: selectedTraceId })
          .get();

        if (!cancelled) setTraceDetail(error ? null : (data as any));
      } catch {
        if (!cancelled) setTraceDetail(null);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedTraceId, agentSlug, branchSlug]);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4">
        <h1>Observability</h1>
        <p className="text-sm text-muted-foreground">
          Inspect recent gen_ai executions for the active branch. Evaluate prompt, model, response,
          and tool behavior for your current branch.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-0 lg:flex-row">
        <div
          className={`${
            selectedTraceId ? "lg:w-2/5 lg:min-w-[320px]" : "w-full"
          } overflow-y-auto pr-0 lg:pr-2`}
        >
          <TraceListPanel
            agentSlug={agentSlug}
            branchSlug={branchSlug}
            selectedTraceId={selectedTraceId}
            onSelectTrace={setSelectedTraceId}
          />
        </div>

        {selectedTraceId && (
          <div className="mt-4 min-w-0 flex-1 overflow-y-auto lg:mt-0">
            <TraceDetail
              trace={traceDetail}
              loading={detailLoading}
              onClose={() => setSelectedTraceId(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
