import { Metadata } from "@grpc/grpc-js";
import { OTLPLogExporter as OTLPLogExporterGrpc } from "@opentelemetry/exporter-logs-otlp-grpc";
import { OTLPLogExporter as OTLPLogExporterProto } from "@opentelemetry/exporter-logs-otlp-proto";
import { OTLPTraceExporter as OTLPTraceExporterGrpc } from "@opentelemetry/exporter-trace-otlp-grpc";
import { OTLPTraceExporter as OTLPTraceExporterProto } from "@opentelemetry/exporter-trace-otlp-proto";
import { CompressionAlgorithm } from "@opentelemetry/otlp-exporter-base";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BatchLogRecordProcessor,
  LoggerProvider,
  createLoggerConfigurator,
} from "@opentelemetry/sdk-logs";
import {
  PrismaInstrumentation,
  registerInstrumentations,
} from "@prisma/instrumentation";

import { betterStackConfig } from "./better-stack";
import { isProduction } from "../env";
import { isRootPathUrl } from "../utils/url";

import type { ElysiaOpenTelemetryOptions } from "@elysiajs/opentelemetry";
import type { SeverityNumber } from "@opentelemetry/api-logs";

export const greptimeOtlpEndpoint =
  process.env.GREPTIMEDB_OTLP_ENDPOINT ?? "http://localhost:4000/v1/otlp";

export const getOtlpGrpcExporterConfig = () => {
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

const getGreptimeTraceExporter = () =>
  new OTLPTraceExporterProto({
    url: `${greptimeOtlpEndpoint}/v1/traces`,
    headers: { "x-greptime-pipeline-name": "greptime_trace_v1" },
    compression: CompressionAlgorithm.GZIP,
  });

const getGreptimeLogExporter = () =>
  new OTLPLogExporterProto({
    url: `${greptimeOtlpEndpoint}/v1/logs`,
    headers: { "x-greptime-pipeline-name": "greptime_identity" },
    compression: CompressionAlgorithm.GZIP,
  });

export const getOtelLogger = (
  serviceName: string,
  minimumSeverity: SeverityNumber,
) => {
  const loggerProvider = new LoggerProvider({
    resource: resourceFromAttributes({
      "service.name": serviceName,
    }),
    loggerConfigurator: createLoggerConfigurator([
      {
        pattern: "*",
        config: {
          minimumSeverity,
        },
      },
    ]),
    processors: [
      new BatchLogRecordProcessor(
        isProduction
          ? new OTLPLogExporterGrpc(getOtlpGrpcExporterConfig())
          : getGreptimeLogExporter(),
      ),
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
        "prisma:engine:query",
        "prisma:engine:response_json_serialization",
        "prisma:engine:serialize",
        "prisma:engine:db_query",
        "prisma:engine:connection",
      ],
    }),
  ],
});

export const getOtelConfig = (
  serviceName: string,
): ElysiaOpenTelemetryOptions => {
  return {
    serviceName,
    checkIfShouldTrace: (request) => {
      if (request.method !== "GET") return true;
      return !isRootPathUrl(request.url);
    },
    traceExporter: isProduction
      ? new OTLPTraceExporterGrpc(getOtlpGrpcExporterConfig())
      : getGreptimeTraceExporter(),
  };
};
