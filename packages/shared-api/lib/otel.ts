import type { ElysiaOpenTelemetryOptions } from "@elysiajs/opentelemetry";
import { DiagConsoleLogger, DiagLogLevel, diag, metrics } from "@opentelemetry/api";
import type { SeverityNumber } from "@opentelemetry/api-logs";
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
import { MeterProvider, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { PrismaInstrumentation, registerInstrumentations } from "@prisma/instrumentation";

import { isProduction } from "../env";
import { getSecret } from "../utils/secrets";
import { isRootPathUrl } from "../utils/url";

const SENSITIVE_SPAN_ATTRIBUTES = [
  "http.request.header.authorization",
  "http.request.header.cookie",
  "http.request.cookie",
];

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

export const greptimeOtlpEndpoint =
  (await getSecret("GreptimeEndpoint")) ?? "http://localhost:4000/v1/otlp";

// Register the MeterProvider eagerly so that any library calling
// metrics.getMeter() at import time gets a real meter instead of a NoopMeter.
// Unlike traces, the metrics API does not use proxies — meters created before
// the provider is registered stay noop forever.
metrics.setGlobalMeterProvider(
  new MeterProvider({
    readers: [
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
          url: `${greptimeOtlpEndpoint}/v1/metrics`,
          compression: CompressionAlgorithm.GZIP,
        }),
      }),
    ],
  }),
);

export const getOtelLogger = (serviceName: string, minimumSeverity: SeverityNumber) => {
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
      ...(isProduction ? [] : [new SimpleLogRecordProcessor(new ConsoleLogRecordExporter())]),
      new BatchLogRecordProcessor(
        new OTLPLogExporter({
          url: `${greptimeOtlpEndpoint}/v1/logs`,
          compression: CompressionAlgorithm.GZIP,
        }),
        {
          maxQueueSize: 8192,
          maxExportBatchSize: 1024,
          scheduledDelayMillis: 2000,
        },
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

function createRedactingSpanProcessor(...args: ConstructorParameters<typeof BatchSpanProcessor>) {
  const processor = new BatchSpanProcessor(...args);

  const originalOnEnd = processor.onEnd.bind(processor);
  processor.onEnd = (span) => {
    const attrs = span.attributes as Record<string, unknown>;
    for (const key of SENSITIVE_SPAN_ATTRIBUTES) {
      if (key in attrs) attrs[key] = "[REDACTED]";
    }
    originalOnEnd(span);
  };

  return processor;
}

export const getOtelConfig = (serviceName: string): ElysiaOpenTelemetryOptions => {
  return {
    serviceName,
    checkIfShouldTrace: (request) => {
      if (request.method !== "GET") return true;
      return !isRootPathUrl(request.url);
    },
    spanProcessors: [
      createRedactingSpanProcessor(
        new OTLPTraceExporter({
          url: `${greptimeOtlpEndpoint}/v1/traces`,
          headers: { "x-greptime-pipeline-name": "greptime_trace_v1" },
          compression: CompressionAlgorithm.GZIP,
        }),
        {
          maxQueueSize: 8192,
          maxExportBatchSize: 1024,
          scheduledDelayMillis: 2000,
        },
      ),
    ],
  };
};
