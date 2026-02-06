import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { CompressionAlgorithm } from "@opentelemetry/otlp-exporter-base";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";

import { getSecret } from "../utils/secrets";

import type { ElysiaOpenTelemetryOptions } from "@elysiajs/opentelemetry";

const getBetterStackConfig = async () => {
  const [endpoint, sourceToken] = await Promise.all([
    getSecret("BetterStackEndpoint", false),
    getSecret("BetterStackSourceToken", false),
  ]);

  if (!endpoint || !sourceToken) {
    console.warn("⚠️ OpenTelemetry Trace Exporter not configured. Skipping...");
    return;
  }

  return {
    url: new URL("/v1/traces", endpoint).toString(),
    headers: { Authorization: `Bearer ${sourceToken}` },
    compression: CompressionAlgorithm.GZIP,
  };
};

const betterStackConfig = await getBetterStackConfig();

export const getOtelConfig = (
  serviceName: string,
): ElysiaOpenTelemetryOptions => ({
  serviceName,
  spanProcessors: betterStackConfig
    ? [new BatchSpanProcessor(new OTLPTraceExporter(betterStackConfig))]
    : undefined,
});
