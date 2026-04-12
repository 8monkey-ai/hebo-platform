import type { ElysiaOpenTelemetryOptions } from "@elysiajs/opentelemetry";
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
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import {
  type BufferConfig,
  type SpanExporter,
  BatchSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { BunSqlInstrumentation } from "@8monkey/opentelemetry-instrumentation-bun-sql";
import { PrismaInstrumentation, registerInstrumentations } from "@prisma/instrumentation";

import { IS_PRODUCTION } from "../env";
import { getSecret } from "../utils/secret";
import { isRootPathUrl } from "../utils/url";

const SENSITIVE_SPAN_ATTRIBUTES = [
  "http.request.header.authorization",
  "http.request.header.cookie",
  "http.request.cookie",
];

export const GREPTIME_OTLP_ENDPOINT = `http://${(await getSecret("GreptimeHost")) ?? "localhost"}:4000/v1/otlp`;

export const createOtelLogger = (serviceName: string, minimumSeverity: SeverityNumber) => {
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
      ...(IS_PRODUCTION ? [] : [new SimpleLogRecordProcessor(new ConsoleLogRecordExporter())]),
      new BatchLogRecordProcessor(
        new OTLPLogExporter({
          url: `${GREPTIME_OTLP_ENDPOINT}/v1/logs`,
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
    new BunSqlInstrumentation({
      requireParentSpan: true,
      ignoreConnectionSpans: true,
      maskStatement: false,
    }),
  ],
});

const REDACTED = "[REDACTED]";

const createRedactingBatchSpanProcessor = (exporter: SpanExporter, config?: BufferConfig) => {
  const processor = new BatchSpanProcessor(exporter, config);
  const originalOnEnd = processor.onEnd.bind(processor);
  const keys = SENSITIVE_SPAN_ATTRIBUTES;

  processor.onEnd = (span) => {
    const attrs = span.attributes as Record<string, unknown>;

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (attrs[key] !== undefined) attrs[key] = REDACTED;
    }

    originalOnEnd(span);
  };

  return processor;
};

export const getOtelConfig = (serviceName: string): ElysiaOpenTelemetryOptions => {
  return {
    serviceName,
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: `${GREPTIME_OTLP_ENDPOINT}/v1/metrics`,
        compression: CompressionAlgorithm.GZIP,
      }),
    }),
    checkIfShouldTrace: (request) => {
      if (request.method !== "GET") return true;
      return !isRootPathUrl(request.url);
    },
    spanProcessors: [
      createRedactingBatchSpanProcessor(
        new OTLPTraceExporter({
          url: `${GREPTIME_OTLP_ENDPOINT}/v1/traces`,
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
