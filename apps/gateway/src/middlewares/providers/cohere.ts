import { createCohere } from "@ai-sdk/cohere";

import { getSecret } from "@hebo/shared-api/utils/secrets";

import type { ApiKeyProviderConfig } from "~api/modules/providers/types";

import { ProviderAdapterBase, type ProviderAdapter } from "./provider";

export class CohereProviderAdapter
  extends ProviderAdapterBase
  implements ProviderAdapter
{
  private config?: ApiKeyProviderConfig;

  static readonly providerSlug = "cohere";

  static readonly SUPPORTED_MODELS_MAP: Record<string, string> = {
    "cohere/embed-v4.0": "embed-v4.0",
  };

  constructor(modelType: string) {
    super(modelType);
  }

  async initialize(config?: ApiKeyProviderConfig): Promise<this> {
    if (config) {
      this.config = config;
    } else {
      const apiKey = await getSecret("CohereApiKey");
      this.config = { apiKey };
    }
    return this;
  }

  async getProvider() {
    const cfg = this.config!;
    return createCohere({ ...cfg });
  }
}
