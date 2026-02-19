import { serializeError } from "serialize-error";

import { otelLogLevels, otelSeverityByLevel } from "./log-levels";

import type { Logger } from "@opentelemetry/api-logs";

type LogLevel = (typeof otelLogLevels)[number];
const getOtelSeverityNumber = (level: LogLevel) => otelSeverityByLevel[level];

const asBody = (value: unknown) =>
  value as NonNullable<Parameters<Logger["emit"]>[0]["body"]>;

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
      const obj = first as Record<string, unknown>;
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

      logRecord = {
        severityNumber,
        body: asBody(body),
        ...(attributes ? { attributes } : {}),
      };
    } else {
      logRecord = {
        severityNumber,
        body: first === undefined ? "service log" : String(first),
      };
    }
    otelLogger.emit(logRecord);
  };
};

export const createPinoCompatibleOtelLogger = (otelLogger: Logger) => {
  const log = createLogHandler(otelLogger);
  const handlers = {} as Record<LogLevel, (...args: unknown[]) => void>;

  for (const level of otelLogLevels) {
    handlers[level] = (...args: unknown[]) => log(level, ...args);
  }

  return handlers;
};
