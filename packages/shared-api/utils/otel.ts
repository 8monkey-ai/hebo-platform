import { getSecret } from "./secrets";

export const getGrafanaCloudOtelpConfig = async () => {
  const [endpoint, instanceId, apiToken] = await Promise.all([
    getSecret("GrafanaCloudOtlpEndpoint", false),
    getSecret("GrafanaCloudOtlpInstanceId", false),
    getSecret("GrafanaCloudOtlpApiToken", false),
  ]);

  if (!endpoint || !instanceId || !apiToken) {
    console.warn("⚠️ OpenTelemetry not configured. Skipping...");
    return;
  }

  return {
    url: new URL("/otlp/v1/traces", endpoint).toString(),
    headers: {
      Authorization: [
        "Basic ",
        Buffer.from([instanceId, apiToken].join(":")).toString("base64"),
      ].join(""),
    },
  };
};
