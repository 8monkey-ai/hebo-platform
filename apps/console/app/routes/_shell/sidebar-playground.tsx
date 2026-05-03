import { useEffect, useState } from "react";

import { Chat } from "@hebo/aikit-ui/blocks/Chat";

import { api, gateway, kyFetch } from "~console/lib/service";
import { gatewayUrl } from "~console/lib/env";

type Workspace = {
  slug: string;
  name: string;
};

export function PlaygroundSidebar({ activeWorkspace }: { activeWorkspace?: Workspace }) {
  const [entries, setEntries] = useState<Array<{ alias: string }>>([]);

  useEffect(() => {
    if (!activeWorkspace) {
      setEntries([]);
      return;
    }

    let cancelled = false;
    const slug = activeWorkspace.slug;
    void Promise.all([
      api.workspaces({ workspaceSlug: slug }).presets.get(),
      gateway.models.get({ query: { endpoints: true } }),
    ]).then(([presets, models]) => {
      if (cancelled) return null;
      const presetSlugs = (presets.data ?? []).map((p) => ({ alias: p.slug }));
      const canonical = (models.data?.data ?? []).map((m) => ({ alias: m.id }));
      setEntries([...presetSlugs, ...canonical]);
      return null;
    });
    return () => {
      cancelled = true;
    };
  }, [activeWorkspace]);

  const modelsConfig = entries.map(({ alias }) => ({
    alias,
    endpoint: {
      baseUrl: new URL("v1", gatewayUrl).toString(),
      fetch: kyFetch as unknown as typeof fetch,
      credentials: "include" as const,
    },
  }));

  return (
    <Chat
      key={`pg-${activeWorkspace?.slug}`}
      name={activeWorkspace?.name}
      modelsConfig={modelsConfig}
      mode="full"
    />
  );
}
