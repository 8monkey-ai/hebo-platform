import type { createDbClient } from "@hebo/database/client";
import type { ProviderSlug } from "@hebo/database/src/types/providers";
import type { ModelConfig, Models } from "@hebo/shared-api/types/model-config";

import { type SupportedModelType } from "./models";

export class ModelConfigService {
  private model?: ModelConfig;

  constructor(private readonly dbClient: ReturnType<typeof createDbClient>) {}

  async getModelType(modelAliasPath: string): Promise<SupportedModelType> {
    const model = await this.getModel(modelAliasPath);
    return model.type as SupportedModelType;
  }

  async getCustomProviderSlug(
    modelAliasPath: string,
  ): Promise<ProviderSlug | undefined> {
    const model = await this.getModel(modelAliasPath);
    // Currently, we only support routing to the first provider.
    return model.routing?.only?.[0] as ProviderSlug | undefined;
  }

  private async getModel(modelAliasPath: string) {
    if (!this.model) {
      this.model = await this.fetchModel(modelAliasPath);
    }
    return this.model;
  }

  private async fetchModel(modelAliasPath: string) {
    const [agentSlug, branchSlug, modelAlias] = modelAliasPath.split("/");
    const branch = await this.dbClient.branches.findFirstOrThrow({
      where: { agent_slug: agentSlug, slug: branchSlug },
      select: { models: true },
    });
    const model = (branch.models as unknown as Models)?.find(
      ({ alias }) => alias === modelAlias,
    );

    if (!model) {
      throw new Error(`Missing model config for alias path ${modelAliasPath}`);
    }

    return model;
  }
}
