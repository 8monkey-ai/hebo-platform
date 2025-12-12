import { createCohere } from "@ai-sdk/cohere";

import type { ApiKeyProviderConfig } from "@hebo/database/src/types/providers";
import { getSecret } from "@hebo/shared-api/utils/secrets";

import { ProviderAdapterBase, type ProviderAdapter } from "./provider";

export class CohereProviderAdapter
  extends ProviderAdapterBase
  implements ProviderAdapter
{
  private config?: ApiKeyProviderConfig;

  // modelType to modelId
  private static readonly SUPPORTED_MODELS_MAP: Record<string, string> = {
    "cohere/embed-v4.0": "embed-v4.0",
  };

  constructor(modelType: string) {
    super("cohere", modelType);
  }

  supportsModel(modelType: string): boolean {
    return modelType in CohereProviderAdapter.SUPPORTED_MODELS_MAP;
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

  async resolveModelId(): Promise<string> {
    const modelId = CohereProviderAdapter.SUPPORTED_MODELS_MAP[this.modelType];
    if (!modelId) {
      throw new Error(`Model ${this.modelType} not supported by Cohere.`);
    }
    return modelId;
  }
}
