import { wrapLanguageModel } from "ai";
import { Elysia } from "elysia";

import { BadRequestError } from "@hebo/shared-api/errors";

import { dbClient } from "~api/middleware/db-client";

import { ModelConfigService } from "./model-config";
import { ModelAdapterFactory } from "./models";
import { ProviderAdapterFactory } from "./providers";

import type {
  LanguageModelV2,
  LanguageModelV2Content,
  LanguageModelV2Middleware,
  LanguageModelV2StreamPart,
} from "@ai-sdk/provider";
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
      const modelType = await modelConfigService.getModelType(modelAliasPath);
      const modelAdapter = ModelAdapterFactory.getAdapter(modelType);
      if (modelAdapter.modality !== modality)
        throw new BadRequestError(
          `Model ${modelType} is not a ${modality} model. It is a ${modelAdapter.modality} model.`,
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
        const modelSpecificMiddleware: LanguageModelV2Middleware = {
          transformParams: async ({ params }) => {
            return {
              ...params,
              providerOptions: params.providerOptions
                ? modelAdapter.transformOptions(params.providerOptions)
                : undefined,
              prompt: modelAdapter.transformPrompt(params.prompt),
            };
          },
          wrapGenerate: async ({ doGenerate }) => {
            const result = await doGenerate();

            const transformedProviderMetadata =
              modelAdapter.transformProviderMetadata(result.providerMetadata);

            const transformedContent = result.content?.map(
              (part: LanguageModelV2Content) => ({
                ...part,
                providerMetadata:
                  "providerMetadata" in part
                    ? modelAdapter.transformProviderMetadata(
                        part.providerMetadata,
                      )
                    : undefined,
              }),
            );
            return {
              ...result,
              content: transformedContent,
              providerMetadata: transformedProviderMetadata,
            };
          },
          wrapStream: async ({ doStream }) => {
            const { stream, ...rest } = await doStream();

            const transformStream = new TransformStream<
              LanguageModelV2StreamPart,
              LanguageModelV2StreamPart
            >({
              transform(chunk, controller) {
                if ("providerMetadata" in chunk && chunk.providerMetadata) {
                  controller.enqueue({
                    ...chunk,
                    providerMetadata: modelAdapter.transformProviderMetadata(
                      chunk.providerMetadata,
                    ),
                  });
                } else {
                  controller.enqueue(chunk);
                }
              },
            });

            return {
              stream: stream.pipeThrough(transformStream),
              ...rest,
            };
          },
        };

        const providerSpecificMiddleware: LanguageModelV2Middleware = {
          transformParams: async ({ params }) => {
            return {
              ...params,
              providerOptions: params.providerOptions
                ? {
                    [providerAdapter.getProviderOptionsName()]:
                      providerAdapter.transformOptions(params.providerOptions),
                  }
                : undefined,
              prompt: providerAdapter.transformPrompt(params.prompt),
            };
          },
        };

        model = wrapLanguageModel({
          model: model as LanguageModelV2,
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
