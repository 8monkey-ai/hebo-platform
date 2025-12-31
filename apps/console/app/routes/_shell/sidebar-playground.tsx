import { Chat } from "@hebo/aikit-ui/blocks/Chat";
import { gatewayUrl, kyFetch } from "~console/lib/service";

type Agent = {
  name: string;
}

type Branch = {
  agent_slug: string;
  models?: Array<{
    alias: string;
  }>;
  slug: string;
};

export function PlaygroundSidebar({ activeAgent, activeBranch }: { activeAgent?: Agent, activeBranch?: Branch }) {
  const modelsConfig = (activeBranch?.models ?? []).map((model) => ({
    alias: `${activeBranch?.agent_slug}/${activeBranch?.slug}/${model.alias}`,
    endpoint: {
      baseUrl: new URL("v1", gatewayUrl).toString(),
      fetch: kyFetch,
      credentials: "include" as const,
    },
  }));

  return <Chat key={`pg-${activeAgent?.name}/${activeBranch?.slug}`} name={activeAgent?.name} modelsConfig={modelsConfig} mode="full" />;
}
