import { ModelAdapterBase } from "./model";

export abstract class GptModelAdapter extends ModelAdapterBase {
  readonly modality = "chat";
}

export class GptOss120bAdapter extends GptModelAdapter {
  readonly id = "openai/gpt-oss-120b";
  readonly name = "OpenAI GPT OSS 120B";
  readonly owned_by = "openai";
  readonly created = 1_764_888_221;
  readonly pricing = {
    monthly_free_tokens: 100_000_000,
  };
}

export class GptOss20bAdapter extends GptModelAdapter {
  readonly id = "openai/gpt-oss-20b";
  readonly name = "OpenAI GPT OSS 20B";
  readonly owned_by = "openai";
  readonly created = 1_764_888_221;
  readonly pricing = {
    monthly_free_tokens: 400_000_000,
  };
}
