import {
  ModelAdapterBase,
} from "../model-adapter";

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
}
