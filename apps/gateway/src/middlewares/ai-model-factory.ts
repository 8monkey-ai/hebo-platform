import { wrapLanguageModel } from "ai";
import { Elysia } from "elysia";

import { BadRequestError } from "@hebo/shared-api/errors";
import { dbClient } from "@hebo/shared-api/middlewares/db-client";

import { ModelConfigService } from "./model-config";
import { ModelAdapterFactory } from "./models";
import { ProviderAdapterFactory } from "./providers";

import type { LanguageModelMiddleware , EmbeddingModel, LanguageModel } from "ai";

type Modality = "chat" | "embedding";

type AiModelFor<M extends Modality> = M extends "chat"
  ? LanguageModel
  : EmbeddingModel<string>;

// FUTURE: Implement caching for expensive operations
export const aiModelFactory = new Elysia({
  name: "ai-model-factory",
})
  .use(dbClient)
  .resolve(({ dbClient }) => {
    const modelConfigService = new ModelConfigService(dbClient);
    const providerAdapterFactory = new ProviderAdapterFactory(dbClient);

    const createAIModel = async <M extends Modality>(
      modelAliasPath: string,
      modality: M,
    ): Promise<AiModelFor<M>> => {
      const modelType = await modelConfigService.getModelType(modelAliasPath);
      const modelAdapter = ModelAdapterFactory.getAdapter(modelType);

      if (modelAdapter.getModality() !== modality)
        throw new BadRequestError(
          `Model ${modelAliasPath} (${modelType}) is not a ${modality} model.`,
        );

      const customProviderSlug =
        await modelConfigService.getCustomProviderSlug(modelAliasPath);
      const providerAdapter = await (customProviderSlug
        ? providerAdapterFactory.createCustom(modelType, customProviderSlug)
        : providerAdapterFactory.createDefault(modelType));

      const provider = await providerAdapter.getProvider();
      const modelId = await providerAdapter.resolveModelId();

      let model =
        modality === "chat"
          ? (provider.languageModel(modelId) as AiModelFor<M>)
          : (provider.textEmbeddingModel(modelId) as AiModelFor<M>);

      if (modality === "chat") {
        const modelSpecificMiddleware: LanguageModelMiddleware = {
          transformParams: ({ params }: { params: any }) => {
            const transformed = modelAdapter.transformConfigs(
              params.providerOptions ?? {},
            );
            return {
              ...params,
              providerOptions: {
                ...params.providerOptions,
                ...transformed,
              },
            };
          },
        };

        const providerSpecificMiddleware: LanguageModelMiddleware = {
          transformParams: ({ params }: { params: any }) => {
            const transformed = providerAdapter.transformConfigs(
              params.providerOptions ?? {},
            );
            return {
              ...params,
              providerOptions: {
                ...params.providerOptions,
                ...transformed,
              },
            };
          },
        };

        model = wrapLanguageModel({
          model: model as any,
          middleware: [modelSpecificMiddleware, providerSpecificMiddleware],
        }) as AiModelFor<M>;
      }

      return model;
    };

    return {
      aiModelFactory: {
        create: createAIModel,
      },
    };
  })
  .as("scoped");
