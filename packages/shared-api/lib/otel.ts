import { BunSqlInstrumentation } from "@8monkey/opentelemetry-instrumentation-bun-sql";
import type { ElysiaOpenTelemetryOptions } from "@elysiajs/opentelemetry";
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
  // Headers forwarded by hebo-gateway to upstream providers
  "anthropic-beta",
  "anthropic-version",
  "openai-beta",
  "openai-organization",
  "openai-project",
  "x-stainless-arch",
  "x-stainless-lang",
  "x-stainless-os",
  "x-stainless-package-version",
  "x-stainless-runtime",
  "x-stainless-runtime-version",
  "x-client",
  "x-client-name",
  "x-client-type",
  "x-client-version",
  "x-platform",
  "x-platform-version",
  "x-task-id",
  "agent-session-id",
  "x-claude-code-session-id",
  "x-kilo-session",
  "x-kilocode-taskid",
  "x-kilocode-editorname",
  "x-kilocode-feature",
  "x-kilocode-organizationid",
  "x-kilocode-projectid",
  "x-kilocode-tester",
  "or_app_name",
  "x-openrouter-categories",
  "x-openrouter-title",
  "x-title",
  "x-amzn-bedrock-guardrailidentifier",
  "x-amzn-bedrock-guardrailversion",
  "x-amzn-bedrock-performanceconfig-latency",
  "x-amzn-bedrock-trace",
  "x-goog-api-client",
  "x-vertex-ai-endpoint-id",
  "x-vertex-ai-llm-request-type",
  "x-vertex-ai-llm-shared-request-type",
];

const ALLOWED_RESPONSE_HEADERS = [
  "content-length",
  "content-type",
  "cache-control",
  "x-request-id",
  // Headers forwarded by hebo-gateway from upstream providers
  "retry-after",
  "retry-after-ms",
  "x-should-retry",
];

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

export const getOtelConfig = (serviceName: string): ElysiaOpenTelemetryOptions => {
  return {
    serviceName,
    headersToSpanAttributes: {
      requestHeaders: ALLOWED_REQUEST_HEADERS,
      responseHeaders: ALLOWED_RESPONSE_HEADERS,
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
