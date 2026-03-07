import type { ElysiaOpenTelemetryOptions } from "@elysiajs/opentelemetry";
import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";
import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-proto";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { CompressionAlgorithm } from "@opentelemetry/otlp-exporter-base";
import {
  BatchLogRecordProcessor,
  ConsoleLogRecordExporter,
  LoggerProvider,
  SimpleLogRecordProcessor,
  createLoggerConfigurator,
} from "@opentelemetry/sdk-logs";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { PrismaInstrumentation } from "@prisma/instrumentation";

import { isProduction } from "../env";
import { getSecret } from "../utils/secrets";
import { isRootPathUrl } from "../utils/url";

const greptimeOtlpEndpoint =
  (await getSecret("GreptimeEndpoint")) ?? "http://localhost:4000/v1/otlp";

let initPromise: Promise<void> | undefined;

export function initOtel(serviceName: string, minimumSeverity?: SeverityNumber) {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

    const sdk = new NodeSDK({
      serviceName,
      traceExporter: new OTLPTraceExporter({
        url: `${greptimeOtlpEndpoint}/v1/traces`,
        headers: { "x-greptime-pipeline-name": "greptime_trace_v1" },
        compression: CompressionAlgorithm.GZIP,
      }),
      metricReaders: [
        new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter({
            url: `${greptimeOtlpEndpoint}/v1/metrics`,
            compression: CompressionAlgorithm.GZIP,
          }),
        }),
      ],
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

    sdk.start();

    const loggerProvider = new LoggerProvider({
      loggerConfigurator: createLoggerConfigurator([
        {
          pattern: "*",
          config: {
            minimumSeverity:
              minimumSeverity ?? (isProduction ? SeverityNumber.INFO : SeverityNumber.DEBUG),
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
        ),
      ],
    });

    logs.setGlobalLoggerProvider(loggerProvider);
  })();

  return initPromise;
}

export const getElysiaOtelConfig = (serviceName: string): ElysiaOpenTelemetryOptions => {
  return {
    serviceName,
    checkIfShouldTrace: (request) => {
      if (request.method !== "GET") return true;
      return !isRootPathUrl(request.url);
    },
  };
};
