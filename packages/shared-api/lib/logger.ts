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
type ConfigLogLevel = LogLevel | "silent";

const levelWeightByLevel: Record<ConfigLogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  silent: 60,
};

const getLogLevelWeight = (level: string): number =>
  levelWeightByLevel[level as ConfigLogLevel] ?? levelWeightByLevel.info;

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

const noop = () => {};

const serializeError = (error: Error) => ({
  message: error.message,
  stack: error.stack,
});

const asBody = (value: unknown) =>
  value as NonNullable<Parameters<Logger["emit"]>[0]["body"]>;

const buildObjectLog = (
  severityNumber: SeverityNumber,
  obj: Record<string, unknown>,
  msg?: string,
): Parameters<Logger["emit"]>[0] => {
  const err = obj.err;
  if (err instanceof Error) {
    const rest = { ...obj };
    delete rest.err;
    return {
      severityNumber,
      body: asBody({
        ...(msg ? { msg } : {}),
        ...rest,
        err: serializeError(err),
      }),
      attributes: { "error.type": err.name },
    };
  }

  return {
    severityNumber,
    body: asBody(msg ? { msg, ...obj } : obj),
  };
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

const createOtelLogger = (serviceName: string) => {
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

  return loggerProvider.getLogger(serviceName);
};

const createLogHandler = (
  otelLogger: Logger,
): ((level: LogLevel, ...args: unknown[]) => void) => {
  return (level: LogLevel, ...args: unknown[]) => {
    if (getLogLevelWeight(level) < configuredLogLevelWeight) return;
    const severityNumber = getSeverityNumber(level);

    const first = args[0];
    const second = args[1];
    const msg =
      typeof second === "string" && second.length > 0 ? second : undefined;
    let logRecord: Parameters<Logger["emit"]>[0];

    if (typeof first === "string") {
      logRecord = {
        severityNumber,
        body: first,
      };
    } else if (first instanceof Error) {
      logRecord = {
        severityNumber,
        body: asBody({
          ...(msg ? { msg } : {}),
          ...serializeError(first),
        }),
        attributes: { "error.type": first.name },
      };
    } else if (typeof first === "object" && first !== null) {
      logRecord = buildObjectLog(
        severityNumber,
        first as Record<string, unknown>,
        msg,
      );
    } else {
      logRecord = {
        severityNumber,
        body: first === undefined ? "service log" : String(first),
      };
    }
    otelLogger.emit(logRecord);
  };
};

export const createLogger = (serviceName: string) => {
  if (configuredLogLevelWeight === levelWeightByLevel.silent) {
    return {
      trace: noop,
      debug: noop,
      info: noop,
      warn: noop,
      error: noop,
    };
  }

  const otelLogger = createOtelLogger(serviceName || "unknown_service:bun");
  const log = createLogHandler(otelLogger);

  return {
    trace: (...args: unknown[]) => log("trace", ...args),
    debug: (...args: unknown[]) => log("debug", ...args),
    info: (...args: unknown[]) => log("info", ...args),
    warn: (...args: unknown[]) => log("warn", ...args),
    error: (...args: unknown[]) => log("error", ...args),
  };
};
