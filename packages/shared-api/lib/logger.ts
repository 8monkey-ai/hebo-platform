import { SeverityNumber } from "@opentelemetry/api-logs";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BatchLogRecordProcessor,
  ConsoleLogRecordExporter,
  LoggerProvider,
} from "@opentelemetry/sdk-logs";

import { logLevel } from "../env";

import type { LogAttributes, Logger } from "@opentelemetry/api-logs";

const enabledByLevel = {
  trace: { trace: true, debug: true, info: true, warn: true, error: true },
  debug: { trace: false, debug: true, info: true, warn: true, error: true },
  info: { trace: false, debug: false, info: true, warn: true, error: true },
  warn: { trace: false, debug: false, info: false, warn: true, error: true },
  error: { trace: false, debug: false, info: false, warn: false, error: true },
  silent: {
    trace: false,
    debug: false,
    info: false,
    warn: false,
    error: false,
  },
} as const;

type LogLevel = keyof typeof enabledByLevel;

const configuredLogLevel = (
  logLevel in enabledByLevel ? logLevel : "info"
) as LogLevel;
const getEnabledLevels = (level: LogLevel) => {
  if (level === "trace") return enabledByLevel.trace;
  if (level === "debug") return enabledByLevel.debug;
  if (level === "info") return enabledByLevel.info;
  if (level === "warn") return enabledByLevel.warn;
  if (level === "error") return enabledByLevel.error;
  return enabledByLevel.silent;
};
const enabledLevels = getEnabledLevels(configuredLogLevel);

const noop = () => {};

const createLogMethod = (
  otelLogger: Logger,
  severityNumber: SeverityNumber,
): ((...args: unknown[]) => void) => {
  return (...args: unknown[]) => {
    const first = args[0];
    const second = args[1];
    let body = "service log";
    let attributes: LogAttributes | undefined;

    if (typeof first === "string") {
      body = first;
    } else if (first instanceof Error) {
      attributes = {
        errorName: first.name,
        errorMessage: first.message,
        ...(first.stack ? { errorStack: first.stack } : {}),
      };
      if (typeof second === "string" && second.length > 0) body = second;
    } else if (first && typeof first === "object") {
      attributes = first as LogAttributes;
      if (typeof second === "string" && second.length > 0) body = second;
    } else if (typeof second === "string" && second.length > 0) {
      body = second;
    }

    otelLogger.emit({ severityNumber, body, attributes });
  };
};

export const createGatewayLogger = (serviceName: string) => {
  const normalizedServiceName =
    serviceName.trim().length > 0 ? serviceName : "unknown_service:bun";

  if (configuredLogLevel === "silent") {
    return { trace: noop, debug: noop, info: noop, warn: noop, error: noop };
  }

  const loggerProvider = new LoggerProvider({
    resource: resourceFromAttributes({
      "service.name": normalizedServiceName,
    }),
    processors: [
      new BatchLogRecordProcessor(new ConsoleLogRecordExporter(), {
        maxQueueSize: 2048,
        maxExportBatchSize: 512,
        scheduledDelayMillis: 1000,
      }),
    ],
  });
  const otelLogger = loggerProvider.getLogger(normalizedServiceName);

  return {
    trace: enabledLevels.trace
      ? createLogMethod(otelLogger, SeverityNumber.TRACE)
      : noop,
    debug: enabledLevels.debug
      ? createLogMethod(otelLogger, SeverityNumber.DEBUG)
      : noop,
    info: enabledLevels.info
      ? createLogMethod(otelLogger, SeverityNumber.INFO)
      : noop,
    warn: enabledLevels.warn
      ? createLogMethod(otelLogger, SeverityNumber.WARN)
      : noop,
    error: enabledLevels.error
      ? createLogMethod(otelLogger, SeverityNumber.ERROR)
      : noop,
  };
};
