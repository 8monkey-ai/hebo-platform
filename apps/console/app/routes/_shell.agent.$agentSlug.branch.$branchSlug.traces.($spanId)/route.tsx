import { ChevronLeft } from "lucide-react";
import { useNavigate, useNavigation, useParams } from "react-router";

import { Button } from "@hebo/shared-ui/components/Button";

import { api } from "~console/lib/service";

import type { Route } from "./+types/route";
import { TraceDetail } from "./details";

export async function clientLoader({
  params: { agentSlug, branchSlug, spanId },
}: Route.ClientLoaderArgs) {
  if (!spanId) return null;
  const { data } = await api
    .agents({ agentSlug })
    .branches({ branchSlug })
    .traces({ spanId })
    .get();
  return data;
}

export default function TraceDetailRoute({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const { spanId } = useParams();

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {spanId && (
        <div className="shrink-0 @2xl:hidden">
          <Button variant="outline" size="sm" onClick={() => navigate("..")}>
            <ChevronLeft className="size-4" />
            Back to traces
          </Button>
        </div>
      )}
      <div className="min-h-0 flex-1">
        <TraceDetail trace={loaderData} loading={navigation.state === "loading"} />
      </div>
    </div>
  );
}
