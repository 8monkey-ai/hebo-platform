import { ModelAdapterBase, type OpenAICompatibleOptions } from "../model-adapter";

export class CohereEmbedV4Adapter extends ModelAdapterBase {
  getModelType(): string {
    return "cohere/embed-v4.0";
  }

  getModality(): "chat" | "embedding" {
    return "embedding";
  }

  getDisplayName(): string {
    return "Cohere Embed v4.0";
  }

  transformConfigs(_options: OpenAICompatibleOptions): Record<string, any> {
    // Cohere embedding currently doesn't require specific transformation for standard options
    return {};
  }
}
