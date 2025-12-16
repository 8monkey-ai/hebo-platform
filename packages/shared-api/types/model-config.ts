import type { ProviderSlug } from "@hebo/database/src/types/providers";

export interface ModelConfig {
  alias: string;
  type: string;
  routing?: {
    only: ProviderSlug[];
  };
}

export type Models = ModelConfig[];
