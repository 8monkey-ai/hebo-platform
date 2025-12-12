import { createGroq } from "@ai-sdk/groq";

import type { ApiKeyProviderConfig } from "@hebo/database/src/types/providers";
import { getSecret } from "@hebo/shared-api/utils/secrets";

import { ProviderAdapterBase, type ProviderAdapter } from "./provider";

export class GroqProviderAdapter
  extends ProviderAdapterBase
  implements ProviderAdapter
{
  private config?: ApiKeyProviderConfig;

  // Static map of modelType to Groq-specific modelId
  private static readonly SUPPORTED_MODELS_MAP: Record<string, string> = {
    "openai/gpt-oss-120b": "openai/gpt-oss-120b",
    "openai/gpt-oss-20b": "openai/gpt-oss-20b",
  };

  constructor(modelType: string) {
    super("groq", modelType);
  }

  protected getProviderName(): string {
    return "groq";
  }

  supportsModel(modelType: string): boolean {
    return modelType in GroqProviderAdapter.SUPPORTED_MODELS_MAP;
  }

  transformConfigs(_modelConfig: Record<string, any>): Record<string, any> {
    // Groq currently doesn't require specific transformation for standard options
    return {};
  }

  async initialize(config?: ApiKeyProviderConfig): Promise<this> {
    if (config) {
      this.config = config;
    } else {
      const apiKey = await getSecret("GroqApiKey");
      this.config = { apiKey };
    }
    return this;
  }

  async getProvider() {
    const cfg = this.config!;
    return createGroq({ ...cfg });
  }

  async resolveModelId(): Promise<string> {
    const modelId = GroqProviderAdapter.SUPPORTED_MODELS_MAP[this.modelType];
    if (!modelId) {
      throw new Error(`Model ${this.modelType} not supported by Groq.`);
    }
    return modelId;
  }
}

