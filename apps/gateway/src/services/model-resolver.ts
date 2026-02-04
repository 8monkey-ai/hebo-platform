import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createVertex } from "@ai-sdk/google-vertex";
import { createGroq } from "@ai-sdk/groq";
import { fromTemporaryCredentials } from "@aws-sdk/credential-providers";
import { withCanonicalIdsForBedrock } from "@hebo-ai/gateway/providers/bedrock";
import { withCanonicalIdsForGroq } from "@hebo-ai/gateway/providers/groq";
import { withCanonicalIdsForVertex } from "@hebo-ai/gateway/providers/vertex";
import { withCanonicalIdsForVoyage } from "@hebo-ai/gateway/providers/voyage";
import QuickLRU from "quick-lru";
import { createVoyage } from "voyage-ai-provider";

import { getSecret } from "@hebo/shared-api/utils/secrets";

import type { createDbClient } from "~api/lib/db/client";

export type DbClient = ReturnType<typeof createDbClient>;
import type {
  ApiKeyProviderConfig,
  BedrockProviderConfig,
  Models,
  ProviderSlug,
  VertexProviderConfig,
} from "~api/modules/providers/types";

import { buildWifOptions, injectMetadataCredentials } from "./aws-wif";

import type { ProviderV3 } from "@ai-sdk/provider";
import type { ProviderRegistry } from "@hebo-ai/gateway";

const providerCache = new QuickLRU<string, ProviderV3>({ maxSize: 100 });

export async function loadProviderSecrets() {
  const [
    groqApiKey,
    bedrockRoleArn,
    bedrockRegion,
    voyageApiKey,
    vertexServiceAccountEmail,
    vertexAudience,
    vertexLocation,
    vertexProject,
  ] = await Promise.all([
    getSecret("GroqApiKey"),
    getSecret("BedrockRoleArn"),
    getSecret("BedrockRegion"),
    getSecret("VoyageApiKey"),
    getSecret("VertexServiceAccountEmail"),
    getSecret("VertexAwsProviderAudience"),
    getSecret("VertexLocation"),
    getSecret("VertexProject"),
  ]);

  return {
    groqApiKey,
    bedrockRoleArn,
    bedrockRegion,
    voyageApiKey,
    vertexServiceAccountEmail,
    vertexAudience,
    vertexLocation,
    vertexProject,
  };
}

export function createProvider(
  slug: ProviderSlug,
  config: unknown,
): ProviderV3 {
  switch (slug) {
    case "bedrock": {
      const { bedrockRoleArn, region } = config as BedrockProviderConfig;
      return withCanonicalIdsForBedrock(
        createAmazonBedrock({
          region,
          credentialProvider: fromTemporaryCredentials({
            params: { RoleArn: bedrockRoleArn },
            clientConfig: region ? { region } : undefined,
          }),
        }),
      );
    }
    case "groq": {
      const { apiKey } = config as ApiKeyProviderConfig;
      return withCanonicalIdsForGroq(createGroq({ apiKey }));
    }
    case "vertex": {
      const { serviceAccountEmail, audience, location, project } =
        config as VertexProviderConfig;
      return withCanonicalIdsForVertex(
        createVertex({
          googleAuthOptions: {
            credentials: buildWifOptions(audience, serviceAccountEmail),
            scopes: ["https://www.googleapis.com/auth/cloud-platform"],
          },
          location,
          project,
        }),
      );
    }
    case "voyage": {
      const { apiKey } = config as ApiKeyProviderConfig;
      return withCanonicalIdsForVoyage(createVoyage({ apiKey }));
    }
    default: {
      throw new Error(`Unsupported provider: ${slug}`);
    }
  }
}

export async function resolveModelId(
  aliasPath: string,
  dbClient: DbClient,
  state: Record<string, unknown>,
) {
  const [agentSlug, branchSlug, modelAlias] = aliasPath.split("/");
  const branch = await dbClient.branches.findFirstOrThrow({
    where: { agent_slug: agentSlug, slug: branchSlug },
    select: { models: true },
  });

  const model = (branch.models as Models)?.find(
    ({ alias }) => alias === modelAlias,
  );

  if (!model) {
    throw new Error(`Missing model config for alias path ${aliasPath}`);
  }

  state.modelConfig = {
    type: model.type,
    customProviderSlug: model.routing?.only?.[0] as ProviderSlug | undefined,
  };

  return model.type;
}

export async function resolveProvider(
  modelId: string,
  defaultProviders: ProviderRegistry,
  state: Record<string, unknown>,
  dbClient: DbClient,
) {
  if (modelId.startsWith("google/")) {
    await injectMetadataCredentials();
  }

  const { customProviderSlug } = state.modelConfig as {
    customProviderSlug?: ProviderSlug;
  };

  if (customProviderSlug) {
    const { value: config } =
      await dbClient.provider_configs.getUnredacted(customProviderSlug);

    const cacheKey = `${customProviderSlug}:${modelId}:${JSON.stringify(config)}`;
    let provider = providerCache.get(cacheKey);

    if (!provider) {
      provider = createProvider(customProviderSlug, config);
      providerCache.set(cacheKey, provider);
    }

    return provider;
  }

  if (modelId.startsWith("openai/") && !defaultProviders.bedrock) {
    return defaultProviders.groq;
  }
}
