import { BadRequestError } from "@hebo/shared-api/errors";

import type { createDbClient } from "~api/lib/db/client";
import type {
  ApiKeyProviderConfig,
  BedrockProviderConfig,
  VertexProviderConfig,
  ProviderConfig,
  ProviderSlug,
} from "~api/modules/providers/types";

import { BedrockProviderAdapter } from "./bedrock";
import { GroqProviderAdapter } from "./groq";
import { VertexProviderAdapter } from "./vertex";
import { VoyageProviderAdapter } from "./voyage";

import type { ProviderAdapter } from "./provider";

export class ProviderAdapterFactory {
  static readonly ALL_PROVIDER_ADAPTER_CLASSES = [
    // FUTURE: error-prone for provider fallback feature. Fallback provider depends on the order of this list when the same model is supported by multiple providers.
    BedrockProviderAdapter,
    VoyageProviderAdapter,
    GroqProviderAdapter,
    VertexProviderAdapter,
  ];

  private static adapterCache = new Map<string, ProviderAdapter>();

  constructor(private readonly dbClient: ReturnType<typeof createDbClient>) {}

  async createDefault(modelType: string): Promise<ProviderAdapter> {
    for (const ProviderAdapterClass of ProviderAdapterFactory.ALL_PROVIDER_ADAPTER_CLASSES) {
      if (ProviderAdapterClass.supportsModel(modelType)) {
        return await this.getOrCreateAdapter(
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
    return await this.getOrCreateAdapter(
      providerSlug,
      modelType,
      config as ProviderConfig,
    );
  }

  private async getOrCreateAdapter(
    providerSlug: ProviderSlug,
    modelType: string,
    config?: ProviderConfig,
  ): Promise<ProviderAdapter> {
    const cacheKey = config
      ? `${providerSlug}:${JSON.stringify(config)}`
      : `${providerSlug}:default`;

    let adapter = ProviderAdapterFactory.adapterCache.get(cacheKey);
    if (!adapter) {
      adapter = await this.createAdapter(providerSlug, modelType, config);
      ProviderAdapterFactory.adapterCache.set(cacheKey, adapter);
    }
    return adapter;
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
      case "voyage": {
        return new VoyageProviderAdapter(modelType).initialize(
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
