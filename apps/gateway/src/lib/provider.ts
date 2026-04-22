import { createAlibaba } from "@ai-sdk/alibaba";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createAzure } from "@ai-sdk/azure";
import { createDeepInfra } from "@ai-sdk/deepinfra";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createFireworks } from "@ai-sdk/fireworks";
import { createVertex } from "@ai-sdk/google-vertex";
import { createGroq } from "@ai-sdk/groq";
import { createMoonshotAI } from "@ai-sdk/moonshotai";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { ProviderV3 } from "@ai-sdk/provider";
import { createTogetherAI } from "@ai-sdk/togetherai";
import { createXai } from "@ai-sdk/xai";
import { fromContainerMetadata, fromTemporaryCredentials } from "@aws-sdk/credential-providers";
import { withCanonicalIdsForAlibaba } from "@hebo-ai/gateway/providers/alibaba";
import { withCanonicalIdsForAnthropic } from "@hebo-ai/gateway/providers/anthropic";
import { withCanonicalIdsForBedrock } from "@hebo-ai/gateway/providers/bedrock";
import { withCanonicalIdsForChutes } from "@hebo-ai/gateway/providers/chutes";
import { withCanonicalIdsForDeepInfra } from "@hebo-ai/gateway/providers/deepinfra";
import { withCanonicalIdsForDeepSeek } from "@hebo-ai/gateway/providers/deepseek";
import { withCanonicalIdsForFireworks } from "@hebo-ai/gateway/providers/fireworks";
import { withCanonicalIdsForGroq } from "@hebo-ai/gateway/providers/groq";
import { withCanonicalIdsForMinimax } from "@hebo-ai/gateway/providers/minimax";
import { withCanonicalIdsForMoonshot } from "@hebo-ai/gateway/providers/moonshot";
import { withCanonicalIdsForOpenAI } from "@hebo-ai/gateway/providers/openai";
import { withCanonicalIdsForTogetherAI } from "@hebo-ai/gateway/providers/togetherai";
import { withCanonicalIdsForVertex } from "@hebo-ai/gateway/providers/vertex";
import { withCanonicalIdsForVoyage } from "@hebo-ai/gateway/providers/voyage";
import { withCanonicalIdsForXai } from "@hebo-ai/gateway/providers/xai";
import { withCanonicalIdsForZai } from "@hebo-ai/gateway/providers/zai";
import { createVoyage } from "voyage-ai-provider";
import { createZhipu } from "zhipu-ai-provider";

import { getSecret } from "@hebo/shared-api/utils/secret";

import type {
  ApiKeyConfig,
  AzureConfig,
  BedrockConfig,
  ProviderSlug,
  VertexConfig,
} from "~api/modules/providers/types";

import { buildWifOptions } from "../utils/aws";

export async function loadProviderSecrets() {
  const [
    ANTHROPIC_API_KEY,
    BEDROCK_REGION,
    BEDROCK_ROLE_ARN,
    CHUTES_API_KEY,
    DEEPINFRA_API_KEY,
    DEEPSEEK_API_KEY,
    ENFORCE_BYOK,
    FIREWORKS_API_KEY,
    FOUNDRY_API_KEY,
    FOUNDRY_RESOURCE_NAME,
    FREE_MODEL_IDS_RAW,
    GROQ_API_KEY,
    MINIMAX_API_KEY,
    MOONSHOT_API_KEY,
    OPENAI_API_KEY,
    QWEN_API_KEY,
    TOGETHERAI_API_KEY,
    VERTEX_AUDIENCE,
    VERTEX_LOCATION,
    VERTEX_PROJECT,
    VERTEX_SERVICE_ACCOUNT_EMAIL,
    VOYAGE_API_KEY,
    XAI_API_KEY,
    ZHIPU_API_KEY,
  ] = await Promise.all([
    getSecret("ANTHROPIC_API_KEY"),
    getSecret("BEDROCK_REGION"),
    getSecret("BEDROCK_ROLE_ARN"),
    getSecret("CHUTES_API_KEY"),
    getSecret("DEEPINFRA_API_KEY"),
    getSecret("DEEPSEEK_API_KEY"),
    getSecret("ENFORCE_BYOK").then((v) => v === "true"),
    getSecret("FIREWORKS_API_KEY"),
    getSecret("FOUNDRY_API_KEY"),
    getSecret("FOUNDRY_RESOURCE_NAME"),
    getSecret("FREE_MODEL_IDS"),
    getSecret("GROQ_API_KEY"),
    getSecret("MINIMAX_API_KEY"),
    getSecret("MOONSHOT_API_KEY"),
    getSecret("OPENAI_API_KEY"),
    getSecret("QWEN_API_KEY"),
    getSecret("TOGETHERAI_API_KEY"),
    getSecret("VERTEX_AWS_PROVIDER_AUDIENCE"),
    getSecret("VERTEX_LOCATION"),
    getSecret("VERTEX_PROJECT"),
    getSecret("VERTEX_SERVICE_ACCOUNT_EMAIL"),
    getSecret("VOYAGE_API_KEY"),
    getSecret("XAI_API_KEY"),
    getSecret("ZHIPU_API_KEY"),
  ]);

  const FREE_MODEL_IDS = new Set(
    (FREE_MODEL_IDS_RAW ?? "")
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean),
  );

  return {
    ANTHROPIC_API_KEY,
    BEDROCK_REGION,
    BEDROCK_ROLE_ARN,
    CHUTES_API_KEY,
    DEEPINFRA_API_KEY,
    DEEPSEEK_API_KEY,
    ENFORCE_BYOK,
    FIREWORKS_API_KEY,
    FOUNDRY_API_KEY,
    FOUNDRY_RESOURCE_NAME,
    FREE_MODEL_IDS,
    GROQ_API_KEY,
    MINIMAX_API_KEY,
    MOONSHOT_API_KEY,
    OPENAI_API_KEY,
    QWEN_API_KEY,
    TOGETHERAI_API_KEY,
    VERTEX_AUDIENCE,
    VERTEX_LOCATION,
    VERTEX_PROJECT,
    VERTEX_SERVICE_ACCOUNT_EMAIL,
    VOYAGE_API_KEY,
    XAI_API_KEY,
    ZHIPU_API_KEY,
  };
}

export function createProvider(slug: ProviderSlug, config: unknown): ProviderV3 {
  switch (slug) {
    case "bedrock": {
      const bedrockConfig = config as BedrockConfig;

      switch (bedrockConfig.authMode) {
        case "access-key": {
          const { accessKeyId, secretAccessKey, region } = bedrockConfig;
          return withCanonicalIdsForBedrock(
            createAmazonBedrock({
              region,
              credentialProvider: () => Promise.resolve({ accessKeyId, secretAccessKey }),
            }),
          );
        }
        case "iam-role": {
          const { bedrockRoleArn, region } = bedrockConfig;
          return withCanonicalIdsForBedrock(
            createAmazonBedrock({
              region,
              credentialProvider: fromTemporaryCredentials({
                params: { RoleArn: bedrockRoleArn },
                masterCredentials: fromContainerMetadata(),
                clientConfig: { region },
              }),
            }),
            {
              inferenceProfile: {
                arn: { accountId: bedrockRoleArn?.split(":")[4], region },
              },
            },
          );
        }
        default:
          return withCanonicalIdsForBedrock(createAmazonBedrock());
      }
    }
    case "groq": {
      const { apiKey } = config as ApiKeyConfig;
      return withCanonicalIdsForGroq(createGroq({ apiKey }));
    }
    case "vertex": {
      const vertexConfig = config as VertexConfig;
      const { location, project } = vertexConfig;

      switch (vertexConfig.authMode) {
        case "service-account": {
          const { clientEmail, privateKey } = vertexConfig;
          return withCanonicalIdsForVertex(
            createVertex({
              googleAuthOptions: {
                credentials: { client_email: clientEmail, private_key: privateKey },
                scopes: ["https://www.googleapis.com/auth/cloud-platform"],
              },
              location,
              project,
            }),
          );
        }
        case "identity-federation": {
          const { serviceAccountEmail, audience } = vertexConfig;
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
        default:
          return withCanonicalIdsForVertex(createVertex());
      }
    }
    case "voyage": {
      const { apiKey } = config as ApiKeyConfig;
      return withCanonicalIdsForVoyage(createVoyage({ apiKey }));
    }
    case "anthropic": {
      const { apiKey } = config as ApiKeyConfig;
      return withCanonicalIdsForAnthropic(createAnthropic({ apiKey }));
    }
    case "openai": {
      const { apiKey } = config as ApiKeyConfig;
      return withCanonicalIdsForOpenAI(createOpenAI({ apiKey }));
    }
    case "azure": {
      const { apiKey, resourceName } = config as AzureConfig;
      return createAzure({ apiKey, resourceName });
    }
    case "deepseek": {
      const { apiKey } = config as ApiKeyConfig;
      return withCanonicalIdsForDeepSeek(createDeepSeek({ apiKey }));
    }
    case "xai": {
      const { apiKey } = config as ApiKeyConfig;
      return withCanonicalIdsForXai(createXai({ apiKey }));
    }
    case "qwen": {
      const { apiKey } = config as ApiKeyConfig;
      return withCanonicalIdsForAlibaba(createAlibaba({ apiKey }));
    }
    case "minimax": {
      const { apiKey } = config as ApiKeyConfig;
      return withCanonicalIdsForMinimax(
        createOpenAICompatible({
          name: "minimax",
          baseURL: "https://api.minimax.chat/v1",
          headers: { Authorization: `Bearer ${apiKey}` },
        }),
      );
    }
    case "zhipu": {
      const { apiKey } = config as ApiKeyConfig;
      return withCanonicalIdsForZai(createZhipu({ apiKey }));
    }
    case "moonshot": {
      const { apiKey } = config as ApiKeyConfig;
      return withCanonicalIdsForMoonshot(createMoonshotAI({ apiKey }));
    }
    case "fireworks": {
      const { apiKey } = config as ApiKeyConfig;
      return withCanonicalIdsForFireworks(createFireworks({ apiKey }));
    }
    case "deepinfra": {
      const { apiKey } = config as ApiKeyConfig;
      return withCanonicalIdsForDeepInfra(createDeepInfra({ apiKey }));
    }
    case "togetherai": {
      const { apiKey } = config as ApiKeyConfig;
      return withCanonicalIdsForTogetherAI(createTogetherAI({ apiKey }));
    }
    case "chutes": {
      const { apiKey } = config as ApiKeyConfig;
      return withCanonicalIdsForChutes(
        createOpenAICompatible({
          name: "chutes",
          baseURL: "https://llm.chutes.ai/v1",
          headers: { Authorization: `Bearer ${apiKey}` },
        }),
      );
    }
  }
}
