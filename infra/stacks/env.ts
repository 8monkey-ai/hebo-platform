// Auth
export const authSecret = new sst.Secret("AuthSecret");
export const githubClientId = new sst.Secret("GithubClientId");
export const githubClientSecret = new sst.Secret("GithubClientSecret");
export const googleClientId = new sst.Secret("GoogleClientId");
export const googleClientSecret = new sst.Secret("GoogleClientSecret");
export const microsoftClientId = new sst.Secret("MicrosoftClientId");
export const microsoftClientSecret = new sst.Secret("MicrosoftClientSecret");
export const smtpHost = new sst.Secret("SmtpHost");
export const smtpPort = new sst.Secret("SmtpPort");
export const smtpUser = new sst.Secret("SmtpUser");
export const smtpPass = new sst.Secret("SmtpPass");
export const smtpFrom = new sst.Secret("SmtpFrom");
// LLMs
export const bedrockRoleArn = new sst.Secret("BedrockRoleArn", "undefined");
export const bedrockRegion = new sst.Secret("BedrockRegion", "undefined");
export const cohereApiKey = new sst.Secret("CohereApiKey", "undefined");
export const groqApiKey = new sst.Secret("GroqApiKey", "undefined");
export const vertexServiceAccountEmail = new sst.Secret(
  "VertexServiceAccountEmail",
  "undefined",
);
export const vertexAwsProviderAudience = new sst.Secret(
  "VertexAwsProviderAudience",
  "undefined",
);
export const vertexProject = new sst.Secret("VertexProject", "undefined");
export const vertexLocation = new sst.Secret("VertexLocation", "undefined");

export const grafanaCloudOtlpEndpoint = new sst.Secret(
  "GrafanaCloudOtlpEndpoint",
  "undefined",
);
export const grafanaCloudOtlpInstanceId = new sst.Secret(
  "GrafanaCloudOtlpInstanceId",
  "undefined",
);
export const grafanaCloudOtlpApiToken = new sst.Secret(
  "GrafanaCloudOtlpApiToken",
  "undefined",
);

export const allSecrets = [
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
  bedrockRoleArn,
  bedrockRegion,
  cohereApiKey,
  groqApiKey,
  vertexServiceAccountEmail,
  vertexAwsProviderAudience,
  vertexProject,
  vertexLocation,
  grafanaCloudOtlpEndpoint,
  grafanaCloudOtlpInstanceId,
  grafanaCloudOtlpApiToken,
];
export const isProd = $app.stage === "production";
