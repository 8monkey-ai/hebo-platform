import { BadRequestError } from "@hebo/shared-api/errors";

import { ClaudeOpus45Adapter } from "./claude";
import { Gemini3ProPreviewAdapter, Gemini3FlashPreviewAdapter } from "./gemini";
import { GptOss120bAdapter, GptOss20bAdapter } from "./gpt";
import { type ModelAdapter, type SupportedModel } from "./model";
import { Voyage35Adapter } from "./voyage";

const ALL_MODEL_ADAPTER_CLASSES = [
  GptOss20bAdapter,
  GptOss120bAdapter,
  Gemini3FlashPreviewAdapter,
  Gemini3ProPreviewAdapter,
  ClaudeOpus45Adapter,
  Voyage35Adapter,
];

const MODEL_ADAPTER_MAP: Record<string, () => ModelAdapter> = {};

for (const AdapterClass of ALL_MODEL_ADAPTER_CLASSES) {
  const instance = new AdapterClass();
  MODEL_ADAPTER_MAP[instance.id] = () => new AdapterClass();
}

export const ModelAdapterFactory = {
  getAdapter(modelType: string): ModelAdapter {
    const factoryMethod = MODEL_ADAPTER_MAP[modelType];
    if (!factoryMethod) {
      throw new BadRequestError(
        `No model adapter found for model type: ${modelType}`,
      );
    }
    return factoryMethod();
  },
};

export function getSupportedModels(): SupportedModel[] {
  return ALL_MODEL_ADAPTER_CLASSES.map((AdapterClass) => new AdapterClass());
}
