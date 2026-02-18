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

import type { Logger } from "@opentelemetry/api-logs";

type LogLevel = "trace" | "debug" | "info" | "warn" | "error";

const levelWeightByLevel: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
};

const getLogLevelWeight = (level: string): number =>
  levelWeightByLevel[level as LogLevel] ?? levelWeightByLevel.info;

const getSeverityNumber = (level: LogLevel): SeverityNumber => {
  switch (level) {
    case "trace": {
      return SeverityNumber.TRACE;
    }
    case "debug": {
      return SeverityNumber.DEBUG;
    }
    case "info": {
      return SeverityNumber.INFO;
    }
    case "warn": {
      return SeverityNumber.WARN;
    }
    case "error": {
      return SeverityNumber.ERROR;
    }
  }
};

const configuredLogLevelWeight = getLogLevelWeight(logLevel);

const loggerProviderByServiceName = new Map<string, LoggerProvider>();
const loggerByServiceName = new Map<string, Logger>();

const serializeError = (error: Error) => ({
  message: error.message,
  stack: error.stack,
});

const asBody = (value: unknown) =>
  value as NonNullable<Parameters<Logger["emit"]>[0]["body"]>;

const emitObjectLog = (
  otelLogger: Logger,
  severityNumber: SeverityNumber,
  obj: Record<string, unknown>,
  msg?: string,
) => {
  const err = obj.err;
  if (err instanceof Error) {
    const rest = { ...obj };
    delete rest.err;
    otelLogger.emit({
      severityNumber,
      body: asBody({
        ...(msg ? { msg } : {}),
        ...rest,
        err: serializeError(err),
      }),
      attributes: { "error.type": err.name },
    });
    return;
  }

  otelLogger.emit({
    severityNumber,
    body: asBody(msg ? { msg, ...obj } : obj),
  });
};

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
    ? new BatchLogRecordProcessor(new OTLPLogExporter(logExporterConfig))
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
  const severityNumber = getSeverityNumber(level);
  const levelWeight = getLogLevelWeight(level);

  return (...args: unknown[]) => {
    if (levelWeight < configuredLogLevelWeight) return;

    const first = args[0];
    const second = args[1];
    const msg =
      typeof second === "string" && second.length > 0 ? second : undefined;

    if (typeof first === "string") {
      otelLogger.emit({
        severityNumber,
        body: first,
      });
      return;
    }

    if (first instanceof Error) {
      otelLogger.emit({
        severityNumber,
        body: asBody({
          ...(msg ? { msg } : {}),
          ...serializeError(first),
        }),
        attributes: { "error.type": first.name },
      });
      return;
    }

    if (typeof first === "object" && first !== null) {
      emitObjectLog(
        otelLogger,
        severityNumber,
        first as Record<string, unknown>,
        msg,
      );
      return;
    }

    otelLogger.emit({
      severityNumber,
      body: first === undefined ? "service log" : String(first),
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
