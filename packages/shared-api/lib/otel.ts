import { Metadata } from "@grpc/grpc-js";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { CompressionAlgorithm } from "@opentelemetry/otlp-exporter-base";
import {
  BatchSpanProcessor,
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
} from "@opentelemetry/sdk-trace-base";
import {
  PrismaInstrumentation,
  registerInstrumentations,
} from "@prisma/instrumentation";

import { isProduction } from "../env";
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

const sampler =
  traceExporterConfig && isProduction
    ? new ParentBasedSampler({
        root: new TraceIdRatioBasedSampler(0.1),
      })
    : undefined;

registerInstrumentations({
  instrumentations: [
    new PrismaInstrumentation({
      ignoreSpanTypes: ["prisma:client:compile", "prisma:client:serialize"],
    }),
  ],
});

export const getOtelConfig = (
  serviceName: string,
): ElysiaOpenTelemetryOptions => ({
  serviceName,
  sampler,
  checkIfShouldTrace: (request) => {
    if (request.method !== "GET") return true;

    const pathname = new URL(request.url).pathname;
    return pathname !== "/";
  },
  spanProcessors: traceExporterConfig
    ? [new BatchSpanProcessor(new OTLPTraceExporter(traceExporterConfig))]
    : undefined,
});
