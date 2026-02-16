import { Metadata } from "@grpc/grpc-js";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { CompressionAlgorithm } from "@opentelemetry/otlp-exporter-base";
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import {
  PrismaInstrumentation,
  registerInstrumentations,
} from "@prisma/instrumentation";

import { betterStackConfig } from "./better-stack";
import { isRootPathUrl } from "../utils/url";

import type { ElysiaOpenTelemetryOptions } from "@elysiajs/opentelemetry";

const getTraceExporterConfig = () => {
  if (!betterStackConfig) {
    console.warn(
      "⚠️ OpenTelemetry Trace Exporter not configured. Falling back to console exporter.",
    );
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
const spanProcessor = traceExporterConfig
  ? new BatchSpanProcessor(new OTLPTraceExporter(traceExporterConfig))
  : new SimpleSpanProcessor(new ConsoleSpanExporter());

registerInstrumentations({
  instrumentations: [
    new PrismaInstrumentation({
      ignoreSpanTypes: [
        "prisma:client:compile",
        "prisma:client:serialize",
        "prisma:client:db_query",
      ],
    }),
  ],
});

export const getOtelConfig = (
  serviceName: string,
): ElysiaOpenTelemetryOptions => ({
  serviceName,
  checkIfShouldTrace: (request) => {
    if (request.method !== "GET") return true;
    return !isRootPathUrl(request.url);
  },
  spanProcessors: [spanProcessor],
});
