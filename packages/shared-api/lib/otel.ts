import { Metadata } from "@grpc/grpc-js";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-grpc";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { CompressionAlgorithm } from "@opentelemetry/otlp-exporter-base";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BatchLogRecordProcessor,
  ConsoleLogRecordExporter,
  LoggerProvider,
  SimpleLogRecordProcessor,
  createLoggerConfigurator,
} from "@opentelemetry/sdk-logs";
import {
  PrismaInstrumentation,
  registerInstrumentations,
} from "@prisma/instrumentation";

import { betterStackConfig } from "./better-stack";
import { isProduction } from "../env";
import { otelSeverityByLevel } from "../utils/otel/log-levels";
import { isRootPathUrl } from "../utils/url";

import type { ElysiaOpenTelemetryOptions } from "@elysiajs/opentelemetry";

const getOtlpGrpcExporterConfig = () => {
  if (!betterStackConfig) {
    console.warn(
      "⚠️ OpenTelemetry exporter not configured. Falling back to console exporters.",
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

const otlpExporterConfig = isProduction
  ? getOtlpGrpcExporterConfig()
  : undefined;

export const createOtelLogger = (serviceName: string, logLevel: string) => {
  const loggerProvider = new LoggerProvider({
    resource: resourceFromAttributes({
      "service.name": serviceName,
    }),
    loggerConfigurator: createLoggerConfigurator([
      {
        pattern: "*",
        config: {
          minimumSeverity:
            otelSeverityByLevel[logLevel as keyof typeof otelSeverityByLevel] ??
            otelSeverityByLevel.info,
        },
      },
    ]),
    processors: [
      isProduction
        ? new BatchLogRecordProcessor(new OTLPLogExporter(otlpExporterConfig))
        : new SimpleLogRecordProcessor(new ConsoleLogRecordExporter()),
    ],
  });

  return loggerProvider.getLogger(serviceName);
};

registerInstrumentations({
  instrumentations: [
    new PrismaInstrumentation({
      ignoreSpanTypes: [
        "prisma:client:compile",
        "prisma:client:connect",
        "prisma:client:serialize",
        "prisma:client:db_query",
        "prisma:engine:query",
        "prisma:engine:response_json_serialization",
        "prisma:engine:serialize",
        "prisma:engine:db_query",
        "prisma:engine:connection",
      ],
    }),
  ],
});

export const getOtelTraceConfig = (
  serviceName: string,
): ElysiaOpenTelemetryOptions => {
  return {
    serviceName,
    checkIfShouldTrace: (request) => {
      if (request.method !== "GET") return true;
      return !isRootPathUrl(request.url);
    },
    ...(isProduction
      ? { traceExporter: new OTLPTraceExporter(otlpExporterConfig) }
      : {}),
  };
};
