import { SeverityNumber } from "@opentelemetry/api-logs";
import { serializeError } from "serialize-error";

import type { Logger } from "@opentelemetry/api-logs";

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error";
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

const getOtelSeverityNumber = (level: LogLevel): SeverityNumber => {
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

type LogFn = (...args: unknown[]) => void;
const noop: LogFn = () => {};
const NOOP_LOGGER = {
  trace: noop,
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
} satisfies Record<LogLevel, LogFn>;

const asBody = (value: unknown) =>
  value as NonNullable<Parameters<Logger["emit"]>[0]["body"]>;

const buildObjectLog = (
  severityNumber: SeverityNumber,
  obj: Record<string, unknown>,
  msg?: string,
): Parameters<Logger["emit"]>[0] => {
  const err = obj.err;
  const hasError = err instanceof Error;
  let body = msg ? { msg, ...obj } : obj;
  const attributes = hasError ? { "error.type": err.name } : undefined;

  if (hasError) {
    const rest = { ...obj };
    delete rest.err;
    body = {
      ...(msg ? { msg } : {}),
      ...rest,
      err: serializeError(err),
    };
  }

  return {
    severityNumber,
    body: asBody(body),
    ...(attributes ? { attributes } : {}),
  };
};

const createLogHandler = (
  otelLogger: Logger,
): ((level: LogLevel, ...args: unknown[]) => void) => {
  return (level: LogLevel, ...args: unknown[]) => {
    const severityNumber = getOtelSeverityNumber(level);

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

export const createPinoCompatibleOtelLogger = ({
  serviceName,
  logLevel,
  createOtelLogger,
}: {
  serviceName: string;
  logLevel: string;
  createOtelLogger: (serviceName: string) => Logger;
}) => {
  const otelLogger = createOtelLogger(serviceName || "unknown_service:bun");
  const handlers = { ...NOOP_LOGGER };
  const log = createLogHandler(otelLogger);

  for (const [level, levelWeight] of Object.entries(levelWeightByLevel) as [
    ConfigLogLevel,
    number,
  ][]) {
    if (level === "silent") continue;

    if (levelWeight >= getLogLevelWeight(logLevel)) {
      handlers[level] = (...args: unknown[]) => log(level, ...args);
    }
  }

  return handlers;
};
