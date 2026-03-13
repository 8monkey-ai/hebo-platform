import { ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router";

import { Button } from "@hebo/shared-ui/components/Button";

import { api } from "~console/lib/service";

import { TraceDetail } from "./trace-detail";
import { TraceListPanel } from "./trace-list-panel";
import type { TraceDetailData } from "./types";

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
      <div className="@container grid h-full min-h-0 grid-cols-1 gap-3 overflow-y-hidden pb-4 @2xl:grid-cols-[5fr_7fr]">
        <div
          className={`relative z-10 flex h-full min-h-0 flex-col rounded-2xl border bg-card pt-4 pb-2 ${
            selectedTraceId ? "hidden @2xl:flex" : ""
          }`}
        >
          <TraceListPanel
            agentSlug={agentSlug}
            branchSlug={branchSlug}
            selectedTraceId={selectedTraceId}
            onSelectTrace={setSelectedTraceId}
          />
        </div>

        <div
          className={`h-full min-h-0 overflow-hidden @2xl:hidden ${
            selectedTraceId ? "block" : "hidden"
          }`}
        >
          <div className="flex h-full min-h-0 flex-col gap-3">
            <div className="shrink-0">
              <Button variant="outline" size="sm" onClick={() => setSelectedTraceId(null)}>
                <ChevronLeft className="size-4" />
                Back to traces
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <TraceDetail trace={traceDetail} loading={detailLoading} />
            </div>
          </div>
        </div>

        <div className="hidden h-full min-h-0 overflow-hidden @2xl:block">
          <TraceDetail trace={traceDetail} loading={detailLoading} />
        </div>
      </div>
    </div>
  );
}
