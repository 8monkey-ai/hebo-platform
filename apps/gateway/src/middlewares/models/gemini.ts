import { ModelAdapterBase } from "./model";

export abstract class GeminiModelAdapter extends ModelAdapterBase {
  readonly modality = "chat";
  readonly owned_by = "google";
  readonly pricing = {
    monthly_free_tokens: 0,
  };
}

export abstract class Gemini3ModelAdapter extends GeminiModelAdapter {}

export class Gemini3ProPreviewAdapter extends Gemini3ModelAdapter {
  readonly id = "google/gemini-3-pro-preview";
  readonly name = "Gemini 3 Pro Preview";
  readonly created = 1_765_855_208;
}

export class Gemini3FlashPreviewAdapter extends Gemini3ModelAdapter {
  readonly id = "google/gemini-3-flash-preview";
  readonly name = "Gemini 3 Flash Preview";
  readonly created = 1_766_023_009;
}
