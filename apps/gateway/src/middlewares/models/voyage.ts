import { ModelAdapterBase } from "./model";

export class Voyage35Adapter extends ModelAdapterBase {
  readonly id = "voyage/voyage-3.5";
  readonly modality = "embedding";
  readonly name = "Voyage 3.5";
  readonly owned_by = "voyage";
  readonly created = 1_767_837_920;
  readonly pricing = {
    monthly_free_tokens: 0,
  };
}
