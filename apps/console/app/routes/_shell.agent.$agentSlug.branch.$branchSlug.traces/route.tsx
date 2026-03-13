import { ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";

import { Button } from "@hebo/shared-ui/components/Button";

import { api } from "~console/lib/service";

import { TraceDetail } from "./details";
import { TraceListPanel } from "./list-panel";
import type { TraceDetailData } from "./types";

export default function TracesRoute() {
  const params = useParams();
  const agentSlug = params.agentSlug!;
  const branchSlug = params.branchSlug!;

  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);
  const [traceDetail, setTraceDetail] = useState<TraceDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!selectedSpanId) {
      setTraceDetail(null);
      setDetailLoading(false);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);

    (async () => {
      try {
        const { data, error } = await api
          .agents({ agentSlug })
          .branches({ branchSlug })
          .traces({ spanId: selectedSpanId })
          .get();

        if (cancelled) return;
        if (error) throw error;

        setTraceDetail(data);
      } catch (err) {
        if (!cancelled) {
          setTraceDetail(null);
          toast.error(err instanceof Error ? err.message : "Failed to load trace details");
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedSpanId, agentSlug, branchSlug]);

  return (
    <div className="h-full min-h-0 flex-1 overflow-hidden">
      <div className="grid h-full min-h-0 grid-cols-1 gap-3 @2xl:grid-cols-[5fr_7fr]">
        <div
          className={`relative flex h-full min-h-0 flex-col rounded-lg border bg-card pt-4 pb-2 ${
            selectedSpanId ? "hidden @2xl:flex" : ""
          }`}
        >
          <TraceListPanel
            agentSlug={agentSlug}
            branchSlug={branchSlug}
            selectedSpanId={selectedSpanId}
            onSelectSpan={setSelectedSpanId}
          />
        </div>

        <div className={`h-full min-h-0 @2xl:hidden ${selectedSpanId ? "block" : "hidden"}`}>
          <div className="flex h-full min-h-0 flex-col gap-3">
            <div className="shrink-0">
              <Button variant="outline" size="sm" onClick={() => setSelectedSpanId(null)}>
                <ChevronLeft className="size-4" />
                Back to traces
              </Button>
            </div>
            <div className="min-h-0 flex-1">
              <TraceDetail trace={traceDetail} loading={detailLoading} />
            </div>
          </div>
        </div>

        <div className="hidden h-full min-h-0 @2xl:block">
          <TraceDetail trace={traceDetail} loading={detailLoading} />
        </div>
      </div>
    </div>
  );
}
