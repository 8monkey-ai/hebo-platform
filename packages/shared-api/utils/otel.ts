import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";

import { getSecret } from "./secrets";

import type { ElysiaOpenTelemetryOptions } from "@elysiajs/opentelemetry";


const getGrafanaCloudOtlpConfig = async () => {
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

const otelConfig = await getGrafanaCloudOtlpConfig();

export const getOtelConfig = (
  serviceName: string,
): ElysiaOpenTelemetryOptions => ({
  serviceName,
  spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter(otelConfig))],
});
