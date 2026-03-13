import { useEffect, useState } from "react";
import { useParams } from "react-router";

import { api } from "~console/lib/service";

import { TraceDetail } from "./trace-detail";
import { TraceListPanel } from "./trace-list-panel";

type TraceDetailData = {
  timestamp: string;
  traceId: string;
  operationName: string;
  model: string;
  responseModel: string;
  provider: string;
  status: string;
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
    <div className="h-full min-h-0 flex-1 overflow-y-hidden">
      <div className="grid h-full min-h-0 gap-3 overflow-y-hidden pb-4 xl:grid-cols-[28rem_minmax(0,1fr)]">
        <div className="relative z-10 flex h-full min-h-0 flex-col rounded-2xl border bg-card pt-4 pb-2">
          <TraceListPanel
            agentSlug={agentSlug}
            branchSlug={branchSlug}
            selectedTraceId={selectedTraceId}
            onSelectTrace={setSelectedTraceId}
          />
        </div>

        <div
          className={`h-full min-h-0 overflow-hidden ${selectedTraceId ? "" : "hidden xl:block"}`}
        >
          <TraceDetail trace={traceDetail} loading={detailLoading} />
        </div>
      </div>
    </div>
  );
}
