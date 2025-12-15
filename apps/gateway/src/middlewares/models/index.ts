import { CohereEmbedV4Adapter } from "./cohere";
import {
  Gemini25FlashPreviewAdapter,
  Gemini25FlashLitePreviewAdapter,
} from "./gemini";
import { GptOss120bAdapter, GptOss20bAdapter } from "./gpt";

import type { ModelAdapter } from "./model";

const MODEL_ADAPTER_MAP = {
  "google/gemini-2.5-flash-preview-09-2025": () =>
    new Gemini25FlashPreviewAdapter(),
  "google/gemini-2.5-flash-lite-preview-09-2025": () =>
    new Gemini25FlashLitePreviewAdapter(),
  "openai/gpt-oss-120b": () => new GptOss120bAdapter(),
  "openai/gpt-oss-20b": () => new GptOss20bAdapter(),
  "cohere/embed-v4.0": () => new CohereEmbedV4Adapter(),
};

export type SupportedModelType = keyof typeof MODEL_ADAPTER_MAP;

export const ModelAdapterFactory = {
  getAdapter(modelType: SupportedModelType): ModelAdapter {
    const factoryMethod = MODEL_ADAPTER_MAP[modelType];
    if (!factoryMethod) {
      throw new Error(`No model adapter found for model type: ${modelType}`);
    }
    return factoryMethod();
  },

  getAllModels() {
    return Object.values(MODEL_ADAPTER_MAP).map((factory) => {
      const adapter = factory();
      return {
        id: adapter.getModelType(),
        name: adapter.getDisplayName(),
        created: adapter.getCreatedAt(),
        owned_by: adapter.getOwner(),
        modality: adapter.getModality(),
        pricing: {
          monthly_free_tokens: adapter.getMonthlyFreeTokens(),
        },
      };
    });
  },
};
