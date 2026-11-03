import { BunSqlInstrumentation } from "@8monkey/opentelemetry-instrumentation-bun-sql";
import type { ElysiaOpenTelemetryOptions } from "@elysia/opentelemetry";
import type { SeverityNumber } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-proto";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg";
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
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";

import { IS_PRODUCTION } from "../env";
import { getSecret } from "../utils/secret";
import { isRootPathUrl } from "../utils/url";

/**
 * Headers that are safe and useful to record as span attributes.
 * The fork's safe-by-default behavior excludes all headers unless explicitly
 * listed here — no sensitive data (Authorization, Cookie, etc.) is ever recorded.
 */
const ALLOWED_REQUEST_HEADERS = [
  "accept",
  "accept-encoding",
  "accept-language",
  "cache-control",
  "content-length",
  "content-type",
  "host",
  "origin",
  "user-agent",
  "x-forwarded-proto",
  "x-request-id",
];

const ALLOWED_RESPONSE_HEADERS = [
  "content-length",
  "content-type",
  "cache-control",
  "x-request-id",
];

/**
 * Traces use the built-in `greptime_trace_v2` pipeline (JSON2 attribute columns, GreptimeDB
 * v1.3.0+). It writes to a new `_v2` table, since GreptimeDB rejects V2 writes into a table
 * created by the V1 pipeline. The table is auto-created on the first write.
 *
 * Known issue (v1.3.0): GreptimeDB doesn't escape JSON2 object keys over the Postgres wire
 * protocol, so a span attribute key containing `"` or `\` makes any query returning that
 * span's `span_attributes` fail to parse. Accepted as an edge case (user metadata keys only).
 */
const GREPTIME_TRACE_PIPELINE_NAME = "greptime_trace_v2";
export const GREPTIME_TRACE_TABLE_NAME = "opentelemetry_traces_v2";

export const GREPTIME_OTLP_ENDPOINT = `http://${(await getSecret("GREPTIME_HOST")) ?? "localhost"}:4000/v1/otlp`;

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
    new PgInstrumentation({
      requireParentSpan: true,
      enhancedDatabaseReporting: false,
    }),
    new BunSqlInstrumentation({
      requireParentSpan: true,
      ignoreConnectionSpans: true,
      // FUTURE: set to true to avoid leaking sensitive information
      maskStatement: false,
    }),
  ],
});

export const getOtelConfig = (
  serviceName: string,
  additionalRequestHeaders?: readonly string[],
  additionalResponseHeaders?: readonly string[],
): ElysiaOpenTelemetryOptions => {
  return {
    serviceName,
    headersToSpanAttributes: {
      request: [...ALLOWED_REQUEST_HEADERS, ...(additionalRequestHeaders ?? [])],
      response: [...ALLOWED_RESPONSE_HEADERS, ...(additionalResponseHeaders ?? [])],
    },
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
      new BatchSpanProcessor(
        new OTLPTraceExporter({
          url: `${GREPTIME_OTLP_ENDPOINT}/v1/traces`,
          headers: {
            "x-greptime-pipeline-name": GREPTIME_TRACE_PIPELINE_NAME,
            "x-greptime-trace-table-name": GREPTIME_TRACE_TABLE_NAME,
          },
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
