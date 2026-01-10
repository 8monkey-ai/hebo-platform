import { createVoyage } from "voyage-ai-provider";

import { getSecret } from "@hebo/shared-api/utils/secrets";

import type { ApiKeyProviderConfig } from "~api/modules/providers/types";

import { ProviderAdapterBase, type ProviderAdapter } from "./provider";

export class VoyageProviderAdapter
  extends ProviderAdapterBase
  implements ProviderAdapter
{
  private config?: ApiKeyProviderConfig;

  static readonly providerSlug = "voyage";

  static readonly SUPPORTED_MODELS_MAP: Record<string, string> = {
    "voyage/voyage-3.5": "voyage-3.5",
  };

  constructor(modelType: string) {
    super(modelType);
  }

  async initialize(config?: ApiKeyProviderConfig): Promise<this> {
    if (config) {
      this.config = config;
    } else {
      const apiKey = await getSecret("VoyageApiKey");
      this.config = { apiKey };
    }
    return this;
  }

  async getProvider() {
    const cfg = this.config!;
    return createVoyage({ ...cfg });
  }
}
