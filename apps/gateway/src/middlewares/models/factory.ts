import { ModelAdapter } from "./model-adapter";
import {
  GeminiFlashPreviewAdapter,
  GeminiFlashLiteAdapter,
} from "./adapters/gemini";
import { GptOss120bAdapter, GptOss20bAdapter } from "./adapters/gpt";
import { CohereEmbedV4Adapter } from "./adapters/cohere";

export class ModelAdapterFactory {
  private static readonly MODEL_ADAPTER_MAP: Record<
    string,
    () => ModelAdapter
  > = {
    "google/gemini-2.5-flash-preview-09-2025": () =>
      new GeminiFlashPreviewAdapter(),
    "google/gemini-2.5-flash-lite-preview-09-2025": () =>
      new GeminiFlashLiteAdapter(),
    "openai/gpt-oss-120b": () => new GptOss120bAdapter(),
    "openai/gpt-oss-20b": () => new GptOss20bAdapter(),
    "cohere/embed-v4.0": () => new CohereEmbedV4Adapter(),
  };

  static getAdapter(modelType: string): ModelAdapter {
    const factoryMethod = ModelAdapterFactory.MODEL_ADAPTER_MAP[modelType];
    if (!factoryMethod) {
      throw new Error(`No model adapter found for model type: ${modelType}`);
    }
    return factoryMethod();
  }
}
