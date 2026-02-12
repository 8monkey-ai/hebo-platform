import { Metadata } from "@grpc/grpc-js";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { CompressionAlgorithm } from "@opentelemetry/otlp-exporter-base";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import {
  PrismaInstrumentation,
  registerInstrumentations,
} from "@prisma/instrumentation";

import { betterStackConfig } from "./better-stack";

import type { ElysiaOpenTelemetryOptions } from "@elysiajs/opentelemetry";

const getTraceExporterConfig = () => {
  if (!betterStackConfig) {
    console.warn("⚠️ OpenTelemetry Trace Exporter not configured. Skipping...");
    return;
  }

  const metadata = new Metadata();
  metadata.set("Authorization", `Bearer ${betterStackConfig.sourceToken}`);

  return {
    url: betterStackConfig.endpoint,
    metadata,
    compression: CompressionAlgorithm.GZIP,
  };
};

const traceExporterConfig = getTraceExporterConfig();

registerInstrumentations({
  instrumentations: [new PrismaInstrumentation()],
});

export const getOtelConfig = (
  serviceName: string,
): ElysiaOpenTelemetryOptions => ({
  serviceName,
  spanProcessors: traceExporterConfig
    ? [new BatchSpanProcessor(new OTLPTraceExporter(traceExporterConfig))]
    : undefined,
});
