import type { createDbClient } from "@hebo/database/client";
import type {
  ApiKeyProviderConfig,
  BedrockProviderConfig,
  VertexProviderConfig,
  ProviderConfig,
  ProviderSlug,
} from "@hebo/database/src/types/providers";

import { BedrockProviderAdapter } from "./bedrock";
import { CohereProviderAdapter } from "./cohere";
import { GroqProviderAdapter } from "./groq";
import { VertexProviderAdapter } from "./vertex";

import type { ProviderAdapter } from "./provider";

export class ProviderAdapterFactory {
  constructor(private readonly dbClient: ReturnType<typeof createDbClient>) {}

  async createDefault(modelType: string): Promise<ProviderAdapter> {
    const ALL_PROVIDER_CLASSES = [
      BedrockProviderAdapter,
      CohereProviderAdapter,
      GroqProviderAdapter,
      VertexProviderAdapter,
    ];

    for (const ProviderClass of ALL_PROVIDER_CLASSES) {
      const tempInstance = new ProviderClass(modelType);

      if (tempInstance.supportsModel(modelType)) {
        const providerSlug = tempInstance.getProviderSlug();
        return await this.createAdapter(providerSlug, modelType);
      }
    }

    throw new Error(
      `Unable to create provider adapter: no providers available for model type ${modelType}`,
    );
  }

  async createCustom(
    modelType: string,
    providerSlug: ProviderSlug,
  ): Promise<ProviderAdapter> {
    const { value: config } =
      await this.dbClient.provider_configs.getUnredacted(providerSlug);
    return await this.createAdapter(
      providerSlug,
      modelType,
      config as ProviderConfig,
    );
  }

  private async createAdapter(
    providerSlug: ProviderSlug,
    modelType: string,
    config?: ProviderConfig,
  ) {
    switch (providerSlug) {
      case "bedrock": {
        return new BedrockProviderAdapter(modelType).initialize(
          config as BedrockProviderConfig | undefined,
        );
      }
      case "cohere": {
        return new CohereProviderAdapter(modelType).initialize(
          config as ApiKeyProviderConfig | undefined,
        );
      }
      case "groq": {
        return new GroqProviderAdapter(modelType).initialize(
          config as ApiKeyProviderConfig | undefined,
        );
      }
      case "vertex": {
        return new VertexProviderAdapter(modelType).initialize(
          config as VertexProviderConfig | undefined,
        );
      }
      default: {
        throw new Error(`Unsupported provider: ${providerSlug}`);
      }
    }
  }
}
