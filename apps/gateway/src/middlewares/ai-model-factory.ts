import { record } from "@elysiajs/opentelemetry";
import { Elysia } from "elysia";

import { BadRequestError } from "@hebo/shared-api/errors";
import { dbClient } from "@hebo/shared-api/middlewares/db-client";
import supportedModels from "@hebo/shared-data/json/supported-models";

import { ModelConfigService } from "./model-config";
import { ProviderAdapterFactory } from "./providers";

import type { EmbeddingModel, LanguageModel } from "ai";

type Modality = "chat" | "embedding";

type AiModelFor<M extends Modality> = M extends "chat"
  ? LanguageModel
  : EmbeddingModel<string>;

// FUTURE: Implement caching for expensive operations
export const aiModelFactory = new Elysia({
  name: "ai-model-factory",
})
  .use(dbClient)
  .resolve(function resolveAiModelFactory({ dbClient }) {
    const modelConfigService = new ModelConfigService(dbClient);
    const providerAdapterFactory = new ProviderAdapterFactory(dbClient);

    const createAIModel = async <M extends Modality>(
      modelAliasPath: string,
      modality: M,
    ): Promise<AiModelFor<M>> => {
      const modelType = await record("getModelType", () =>
        modelConfigService.getModelType(modelAliasPath),
      );

      const modelModality = supportedModels.find(
        (model) => model.type === modelType,
      )?.modality;
      if (!modelModality) {
        throw new BadRequestError(
          `Model ${modelAliasPath} (${modelType}) is not supported.`,
        );
      }
      if (modelModality !== modality)
        throw new BadRequestError(
          `Model ${modelAliasPath} (${modelType}) is not a ${modality} model.`,
        );

      const customProviderSlug = await record("getCustomProviderSlug", () =>
        modelConfigService.getCustomProviderSlug(modelAliasPath),
      );
      const providerAdapter = await record("createProviderAdapter", () =>
        customProviderSlug
          ? providerAdapterFactory.createCustom(modelType, customProviderSlug)
          : providerAdapterFactory.createDefault(modelType),
      );
      const [provider, modelId] = await Promise.all([
        record("getProvider", () => providerAdapter.getProvider()),
        record("resolveModelId", () => providerAdapter.resolveModelId()),
      ]);

      return modality === "chat"
        ? (provider.languageModel(modelId) as AiModelFor<M>)
        : (provider.textEmbeddingModel(modelId) as AiModelFor<M>);
    };

    return {
      aiModelFactory: {
        create: createAIModel,
      },
    };
  })
  .as("scoped");
