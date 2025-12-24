import { BadRequestError } from "@hebo/shared-api/errors";

import type {
  ApiKeyProviderConfig,
  BedrockProviderConfig,
  VertexProviderConfig,
  ProviderConfig,
  ProviderSlug,
} from "~api/modules/providers/types";

import { BedrockProviderAdapter } from "./bedrock";
import { CohereProviderAdapter } from "./cohere";
import { GroqProviderAdapter } from "./groq";
import { VertexProviderAdapter } from "./vertex";

import type { ProviderAdapter } from "./provider";
import type { createDbClient } from "../../../../api/prisma/client";

export class ProviderAdapterFactory {
  static readonly ALL_PROVIDER_ADAPTER_CLASSES = [
    // FUTURE: error-prone for provider fallback feature. Fallback provider depends on the order of this list when the same model is supported by multiple providers.
    BedrockProviderAdapter,
    CohereProviderAdapter,
    GroqProviderAdapter,
    VertexProviderAdapter,
  ];

  constructor(private readonly dbClient: ReturnType<typeof createDbClient>) {}

  async createDefault(modelType: string): Promise<ProviderAdapter> {
    for (const ProviderAdapterClass of ProviderAdapterFactory.ALL_PROVIDER_ADAPTER_CLASSES) {
      if (ProviderAdapterClass.supportsModel(modelType)) {
        return await this.createAdapter(
          ProviderAdapterClass.providerSlug,
          modelType,
        );
      }
    }

    throw new BadRequestError(
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
        throw new BadRequestError(`Unsupported provider: ${providerSlug}`);
      }
    }
  }
}
