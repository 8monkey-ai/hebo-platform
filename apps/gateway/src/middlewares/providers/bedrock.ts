import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import {
  BedrockClient,
  ListInferenceProfilesCommand,
} from "@aws-sdk/client-bedrock";

import type { BedrockProviderConfig } from "@hebo/database/src/types/providers";
import { getSecret } from "@hebo/shared-api/utils/secrets";

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

  // Static map of modelType to Bedrock-specific modelId
  private static readonly SUPPORTED_MODELS_MAP: Record<string, string> = {
    "openai/gpt-oss-120b": "openai.gpt-oss-120b-1:0",
    "openai/gpt-oss-20b": "openai.gpt-oss-20b-1:0",
  };

  constructor(modelType: string) {
    super("bedrock", modelType);
  }

  protected getProviderName(): string {
    return "bedrock";
  }

  supportsModel(modelType: string): boolean {
    return modelType in BedrockProviderAdapter.SUPPORTED_MODELS_MAP;
  }

  private static toSnakeCase(str: string): string {
    return str.replaceAll(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }

  private static convertObjectKeysToSnakeCase(
    obj: Record<string, any>,
  ): Record<string, any> {
    const newObj: Record<string, any> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[BedrockProviderAdapter.toSnakeCase(key)] = obj[key];
      }
    }
    return newObj;
  }

  transformConfigs(modelConfig: Record<string, any>): Record<string, any> {
    if (Object.keys(modelConfig).length === 0) return {};

    const snakeCaseConfig =
      BedrockProviderAdapter.convertObjectKeysToSnakeCase(modelConfig);

    return {
      bedrock: {
        additionalModelRequestFields: snakeCaseConfig,
      },
    };
  }

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
    const modelId = BedrockProviderAdapter.SUPPORTED_MODELS_MAP[this.modelType];
    if (!modelId) {
      throw new Error(`Model ${this.modelType} not supported by Bedrock.`);
    }

    // The remaining logic for ListInferenceProfilesCommand to verify ARN
    // can stay as it confirms the resolved modelId exists in AWS.
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
