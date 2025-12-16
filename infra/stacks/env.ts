// Auth
export const stackSecretServerKey = new sst.Secret("StackSecretServerKey");
export const stackPublishableClientKey = new sst.Secret(
  "StackPublishableClientKey",
);
export const stackProjectId = new sst.Secret("StackProjectId");

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
export const grafanaCloudOtlpHeaders = new sst.Secret(
  "GrafanaCloudOtlpHeaders",
  "undefined",
);
// Back-compat (optional): if you prefer to store instanceId + apiKey instead of full headers.
export const grafanaCloudInstanceId = new sst.Secret(
  "GrafanaCloudInstanceId",
  "undefined",
);
export const grafanaCloudApiKey = new sst.Secret(
  "GrafanaCloudApiKey",
  "undefined",
);

export const allSecrets = [
  stackSecretServerKey,
  stackPublishableClientKey,
  stackProjectId,
  bedrockRoleArn,
  bedrockRegion,
  cohereApiKey,
  groqApiKey,
  vertexServiceAccountEmail,
  vertexAwsProviderAudience,
  vertexProject,
  vertexLocation,
  grafanaCloudOtlpEndpoint,
  grafanaCloudOtlpHeaders,
  grafanaCloudInstanceId,
  grafanaCloudApiKey,
];
export const isProd = $app.stage === "production";
