import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";

import { getSecret } from "../utils/secrets";

import type { ElysiaOpenTelemetryOptions } from "@elysiajs/opentelemetry";

const getGrafanaConfig = async () => {
  const [endpoint, instanceId, apiToken] = await Promise.all([
    getSecret("GrafanaEndpoint", false),
    getSecret("GrafanaInstanceId", false),
    getSecret("GrafanaApiToken", false),
  ]);

  if (!endpoint || !instanceId || !apiToken) {
    console.warn("⚠️ OpenTelemetry Trace Exporter not configured. Skipping...");
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

const grafanaConfig = await getGrafanaConfig();

export const getOtelConfig = (
  serviceName: string,
): ElysiaOpenTelemetryOptions => ({
  serviceName,
  spanProcessors: grafanaConfig
    ? [new BatchSpanProcessor(new OTLPTraceExporter(grafanaConfig))]
    : undefined,
});
