// oxlint-disable-next-line triple-slash-reference
/// <reference path="../../.sst/platform/config.d.ts" />

export const isProduction = $app.stage === "production";

const getSstSecret = (name: string) => new sst.Secret(name, "undefined");

// Auth
export const authSecret = getSstSecret("AUTH_SECRET");
export const githubClientId = getSstSecret("GITHUB_CLIENT_ID");
export const githubClientSecret = getSstSecret("GITHUB_CLIENT_SECRET");
export const googleClientId = getSstSecret("GOOGLE_CLIENT_ID");
export const googleClientSecret = getSstSecret("GOOGLE_CLIENT_SECRET");
export const microsoftClientId = getSstSecret("MICROSOFT_CLIENT_ID");
export const microsoftClientSecret = getSstSecret("MICROSOFT_CLIENT_SECRET");
export const smtpHost = getSstSecret("SMTP_HOST");
export const smtpPort = getSstSecret("SMTP_PORT");
export const smtpUser = getSstSecret("SMTP_USER");
export const smtpPass = getSstSecret("SMTP_PASS");
export const smtpFrom = getSstSecret("SMTP_FROM");

// LLMs
export const anthropicApiKey = getSstSecret("ANTHROPIC_API_KEY");
export const foundryApiKey = getSstSecret("FOUNDRY_API_KEY");
export const foundryResourceName = getSstSecret("FOUNDRY_RESOURCE_NAME");
export const bedrockRegion = getSstSecret("BEDROCK_REGION");
export const bedrockRoleArn = getSstSecret("BEDROCK_ROLE_ARN");
export const groqApiKey = getSstSecret("GROQ_API_KEY");
export const openAiApiKey = getSstSecret("OPENAI_API_KEY");
export const vertexAwsProviderAudience = getSstSecret("VERTEX_AWS_PROVIDER_AUDIENCE");
export const vertexLocation = getSstSecret("VERTEX_LOCATION");
export const vertexProject = getSstSecret("VERTEX_PROJECT");
export const vertexServiceAccountEmail = getSstSecret("VERTEX_SERVICE_ACCOUNT_EMAIL");
export const voyageApiKey = getSstSecret("VOYAGE_API_KEY");

// BYOK
export const enforceByok = getSstSecret("ENFORCE_BYOK");
export const freeModelIds = getSstSecret("FREE_MODEL_IDS");

// OTEL Exporter
export const greptimeHost = getSstSecret("GREPTIME_HOST");

export const authSecrets = [
  authSecret,
  githubClientId,
  githubClientSecret,
  googleClientId,
  googleClientSecret,
  microsoftClientId,
  microsoftClientSecret,
  smtpHost,
  smtpPort,
  smtpUser,
  smtpPass,
  smtpFrom,
];

export const llmSecrets = [
  anthropicApiKey,
  bedrockRegion,
  bedrockRoleArn,
  enforceByok,
  foundryApiKey,
  foundryResourceName,
  freeModelIds,
  groqApiKey,
  openAiApiKey,
  vertexAwsProviderAudience,
  vertexLocation,
  vertexProject,
  vertexServiceAccountEmail,
  voyageApiKey,
];
