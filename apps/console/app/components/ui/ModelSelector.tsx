import { useSnapshot } from "valtio";

import { Badge } from "@hebo/shared-ui/components/Badge";
import { Select } from "@hebo/shared-ui/components/Select";

import { shellStore } from "~console/state/shell";

import type { ComponentProps } from "react";

function ModelSelector({
  ...props
}: Omit<ComponentProps<typeof Select>, "items">) {
  const { models } = useSnapshot(shellStore);

  return (
    <Select
      {...props}
      items={Object.entries(models ?? {}).map(([id, m]) => ({
        value: id,
        name: (
          <>
            {m.name}{" "}
            {m.monthlyFreeTokens > 0 && (
              <Badge className="bg-green-600 text-white">Free Tier</Badge>
            )}
            {m.modality[0] === "embedding" && (
              <Badge className="bg-blue-500 text-white">Embeddings</Badge>
            )}
          </>
        ),
      }))}
      disabled={Object.keys(models ?? {}).length === 0}
      placeholder={
        Object.keys(models ?? {}).length > 0
          ? "Select the model"
          : "Error: Couldn't load models"
      }
    />
  );
}

export { ModelSelector };
