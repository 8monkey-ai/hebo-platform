import { ModelAdapterBase } from "./model";

export class CohereEmbedV4Adapter extends ModelAdapterBase {
  readonly id = "cohere/embed-v4.0";
  readonly modality = "embedding";
  readonly name = "Cohere Embed v4.0";
  readonly owned_by = "cohere";
  readonly created = 1_764_888_221;
  readonly pricing = {
    monthly_free_tokens: 0,
  };
}
