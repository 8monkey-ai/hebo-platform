import { metrics } from "@opentelemetry/api";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-proto";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
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
  MeterProvider,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import {
  PrismaInstrumentation,
  registerInstrumentations,
} from "@prisma/instrumentation";

import { getSecret } from "../utils/secrets";
import { isRootPathUrl } from "../utils/url";

import type { ElysiaOpenTelemetryOptions } from "@elysiajs/opentelemetry";
import type { SeverityNumber } from "@opentelemetry/api-logs";

export const greptimeOtlpEndpoint =
  (await getSecret("GreptimeEndpoint")) ?? "http://localhost:4000/v1/otlp";

// Register the MeterProvider eagerly so that any library calling
// metrics.getMeter() at import time gets a real meter instead of a NoopMeter.
// Unlike traces, the metrics API does not use proxies — meters created before
// the provider is registered stay noop forever.
const metricReader = new PeriodicExportingMetricReader({
  exporter: new OTLPMetricExporter({
    url: `${greptimeOtlpEndpoint}/v1/metrics`,
    headers: { "x-greptime-pipeline-name": "greptime_identity" },
    compression: CompressionAlgorithm.GZIP,
  }),
  exportIntervalMillis: 60_000,
});

metrics.setGlobalMeterProvider(new MeterProvider({ readers: [metricReader] }));

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
      new SimpleLogRecordProcessor(new ConsoleLogRecordExporter()),
      new BatchLogRecordProcessor(
        new OTLPLogExporter({
          url: `${greptimeOtlpEndpoint}/v1/logs`,
          headers: { "x-greptime-pipeline-name": "greptime_identity" },
          compression: CompressionAlgorithm.GZIP,
        }),
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
    traceExporter: new OTLPTraceExporter({
      url: `${greptimeOtlpEndpoint}/v1/traces`,
      headers: { "x-greptime-pipeline-name": "greptime_trace_v1" },
      compression: CompressionAlgorithm.GZIP,
    }),
  };
};
