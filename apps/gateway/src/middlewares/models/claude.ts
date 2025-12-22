import { ModelAdapterBase } from "./model";

export class ClaudeOpus45Adapter extends ModelAdapterBase {
  readonly id = "anthropic/claude-opus-4-5-v1";
  readonly name = "Anthropic Claude Opus 4.5";
  readonly owned_by = "anthropic";
  readonly created = 1_766_369_841;
  readonly modality = "chat";
  readonly pricing = {
    monthly_free_tokens: 0,
  };
}
