import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import {
  BedrockClient,
  ListInferenceProfilesCommand,
} from "@aws-sdk/client-bedrock";

import { getSecret } from "@hebo/shared-api/utils/secrets";

import type { BedrockProviderConfig } from "~api/modules/providers/types";

import { assumeRole } from "./adapters/aws";
import { ProviderAdapterBase, type ProviderAdapter } from "./provider";

type BedrockCredentials =
  ReturnType<typeof assumeRole> extends Promise<infer T> ? T : never;

export class BedrockProviderAdapter
  extends ProviderAdapterBase
  implements ProviderAdapter
{
  private config?: BedrockProviderConfig;
  private credentials?: BedrockCredentials;

  static readonly providerSlug = "bedrock";

  constructor(modelType: string) {
    super(modelType);
  }

  static readonly SUPPORTED_MODELS_MAP: Record<string, string> = {
    "openai/gpt-oss-120b": "openai.gpt-oss-120b-1:0",
    "openai/gpt-oss-20b": "openai.gpt-oss-20b-1:0",
    "anthropic/claude-opus-4-5-v1": "anthropic.claude-opus-4-5-20251101-v1:0",
  };

  private async getCredentials() {
    if (!this.credentials) {
      const cfg = this.config!;
      this.credentials = await assumeRole(cfg.region, cfg.bedrockRoleArn);
    }
    return this.credentials;
  }

  async initialize(config?: BedrockProviderConfig): Promise<this> {
    if (config) {
      this.config = config;
    } else {
      const [bedrockRoleArn, region] = await Promise.all([
        getSecret("BedrockRoleArn"),
        getSecret("BedrockRegion"),
      ]);
      this.config = { bedrockRoleArn, region };
    }
    return this;
  }

  async getProvider() {
    const credentials = await this.getCredentials();
    const { region } = this.config!;
    return createAmazonBedrock({
      ...credentials,
      region,
    });
  }

  async resolveModelId(): Promise<string> {
    const modelId = await super.resolveModelId();

    const { region } = this.config!;
    const client = new BedrockClient({
      region,
      credentials: await this.getCredentials(),
    });
    let nextToken: string | undefined;
    do {
      const res = await client.send(
        new ListInferenceProfilesCommand({ nextToken }),
      );
      for (const prof of res.inferenceProfileSummaries ?? []) {
        const arn = prof.inferenceProfileArn ?? "";
        if (arn.includes(modelId)) {
          return arn;
        }
      }
      nextToken = res.nextToken;
    } while (nextToken);
    return modelId;
  }
}
