import { Metadata } from "@grpc/grpc-js";
import { SeverityNumber } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-grpc";
import { CompressionAlgorithm } from "@opentelemetry/otlp-exporter-base";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BatchLogRecordProcessor,
  ConsoleLogRecordExporter,
  LoggerProvider,
  SimpleLogRecordProcessor,
} from "@opentelemetry/sdk-logs";

import { logLevel } from "../env";
import { betterStackConfig } from "./better-stack";

import type { LogAttributes, Logger } from "@opentelemetry/api-logs";

type LogLevel = "trace" | "debug" | "info" | "warn" | "error";

const getLogLevelWeight = (level: string): number => {
  switch (level) {
    case "trace": {
      return 10;
    }
    case "debug": {
      return 20;
    }
    case "info": {
      return 30;
    }
    case "warn": {
      return 40;
    }
    case "error": {
      return 50;
    }
    default: {
      return 30;
    }
  }
};

const configuredLogLevelWeight = getLogLevelWeight(logLevel);

const loggerProviderByServiceName = new Map<string, LoggerProvider>();
const loggerByServiceName = new Map<string, Logger>();

const getLogExporterConfig = () => {
  if (!betterStackConfig) {
    console.warn(
      "⚠️ OpenTelemetry Log Exporter not configured. Falling back to console exporter.",
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

const getOrCreateOtelLogger = (serviceName: string) => {
  const cachedLogger = loggerByServiceName.get(serviceName);
  if (cachedLogger) return cachedLogger;

  const logExporterConfig = getLogExporterConfig();
  const logRecordProcessor = logExporterConfig
    ? new BatchLogRecordProcessor(new OTLPLogExporter(logExporterConfig), {
        maxQueueSize: 2048,
        maxExportBatchSize: 512,
        scheduledDelayMillis: 1000,
      })
    : new SimpleLogRecordProcessor(new ConsoleLogRecordExporter());

  const loggerProvider = new LoggerProvider({
    resource: resourceFromAttributes({
      "service.name": serviceName,
    }),
    processors: [logRecordProcessor],
  });

  const otelLogger = loggerProvider.getLogger(serviceName);
  loggerProviderByServiceName.set(serviceName, loggerProvider);
  loggerByServiceName.set(serviceName, otelLogger);
  return otelLogger;
};

const createLogMethod = (
  otelLogger: Logger,
  level: LogLevel,
): ((...args: unknown[]) => void) => {
  let severityNumber: SeverityNumber;
  switch (level) {
    case "trace": {
      severityNumber = SeverityNumber.TRACE;
      break;
    }
    case "debug": {
      severityNumber = SeverityNumber.DEBUG;
      break;
    }
    case "info": {
      severityNumber = SeverityNumber.INFO;
      break;
    }
    case "warn": {
      severityNumber = SeverityNumber.WARN;
      break;
    }
    case "error": {
      severityNumber = SeverityNumber.ERROR;
      break;
    }
  }

  return (...args: unknown[]) => {
    if (getLogLevelWeight(level) < configuredLogLevelWeight) return;

    const first = args[0];
    const second = args[1];

    if (typeof first === "string") {
      otelLogger.emit({
        severityNumber,
        body: first,
        attributes:
          second && typeof second === "object"
            ? (second as LogAttributes)
            : undefined,
      });
      return;
    }

    otelLogger.emit({
      severityNumber,
      body:
        typeof second === "string" && second.length > 0
          ? second
          : "service log",
      attributes:
        first && typeof first === "object"
          ? (first as LogAttributes)
          : undefined,
    });
  };
};

export const createLogger = (serviceName: string) => {
  const otelLogger = getOrCreateOtelLogger(
    serviceName || "unknown_service:bun",
  );

  return {
    trace: createLogMethod(otelLogger, "trace"),
    debug: createLogMethod(otelLogger, "debug"),
    info: createLogMethod(otelLogger, "info"),
    warn: createLogMethod(otelLogger, "warn"),
    error: createLogMethod(otelLogger, "error"),
  };
};

export const shutdownLoggers = async () => {
  await Promise.all(
    Array.from(loggerProviderByServiceName.values(), (loggerProvider) =>
      loggerProvider.shutdown(),
    ),
  );
};
