import type { Models, ProviderSlug } from "~api/modules/providers/types";
import type { createDbClient } from "~api/prisma/client";
type ModelConfig = (typeof Models)[number];

export class ModelConfigService {
  private model?: ModelConfig;

  constructor(private readonly dbClient: ReturnType<typeof createDbClient>) {}

  async getModelType(modelAliasPath: string): Promise<string> {
    const model = await this.getModel(modelAliasPath);
    return model.type;
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
    const model = (branch.models as Models)?.find(
      ({ alias }) => alias === modelAlias,
    );

    if (!model) {
      throw new Error(`Missing model config for alias path ${modelAliasPath}`);
    }

    return model;
  }
}
