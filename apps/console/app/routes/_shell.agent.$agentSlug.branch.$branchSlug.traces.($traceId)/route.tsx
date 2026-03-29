import { ChevronLeft } from "lucide-react";
import { useLocation, useNavigate, useNavigation, useParams } from "react-router";
import type { ShouldRevalidateFunctionArgs } from "react-router";

import { Button } from "@hebo/shared-ui/components/Button";

import { api } from "~console/lib/service";

import type { Route } from "./+types/route";
import { TraceDetail } from "./details";

export async function clientLoader({
  params: { agentSlug, branchSlug, traceId },
}: Route.ClientLoaderArgs) {
  if (!traceId) return null;
  const { data } = await api
    .agents({ agentSlug })
    .branches({ branchSlug })
    .traces({ traceId })
    .get();
  return data?.[0] ?? null;
}

export function shouldRevalidate({ currentParams, nextParams }: ShouldRevalidateFunctionArgs) {
  return currentParams.traceId !== nextParams.traceId;
}

export default function TraceDetailRoute({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const location = useLocation();

  const { traceId } = useParams();

  const loading =
    navigation.state === "loading" && navigation.location?.pathname !== location.pathname;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {traceId && (
        <div className="shrink-0 @2xl:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void navigate("..");
            }}
          >
            <ChevronLeft className="size-4" />
            Back to traces
          </Button>
        </div>
      )}
      <div className="min-h-0 flex-1">
        <TraceDetail trace={loaderData} loading={loading} />
      </div>
    </div>
  );
}
