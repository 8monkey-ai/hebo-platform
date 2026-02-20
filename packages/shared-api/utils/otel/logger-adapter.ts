import { otelSeverityByLevel } from "./log-levels";

import type { Logger } from "@opentelemetry/api-logs";

type LogLevel = keyof typeof otelSeverityByLevel;
type LogRecord = Parameters<Logger["emit"]>[0];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !(value instanceof Error);

const serializeError = (
  err: unknown,
  _seen?: WeakSet<object>,
): Record<string, unknown> => {
  if (!(err instanceof Error)) return { message: String(err) };

  const seen = _seen ?? new WeakSet();
  if (seen.has(err))
    return { name: err.name, message: err.message, circular: true };
  seen.add(err);

  const out: Record<string, unknown> = {};

  for (const k of Object.getOwnPropertyNames(err)) {
    if (k.startsWith("_")) continue;

    let val;
    try {
      val = (err as unknown as Record<string, unknown>)[k];
    } catch {
      val = "[Unreadable]";
    }

    if (typeof val === "bigint") val = `${val}n`;

    out[k] = val instanceof Error ? serializeError(val, seen) : val;
  }

  return out;
};

const buildLogRecord = (args: unknown[]): LogRecord => {
  if (args.length === 0) return {};

  const [first, second] = args;

  let obj: Record<string, unknown> | undefined;
  let err: Record<string, unknown> | undefined;
  let errorType: string | undefined;
  let msg: string | undefined;

  if (first instanceof Error) {
    err = serializeError(first);
    errorType = first.name;
  } else if (isRecord(first)) {
    if (first["err"] instanceof Error) {
      errorType = first["err"].name;
      err = serializeError(first["err"]);
      obj = Object.assign({}, first);
      delete obj.err;
    } else {
      obj = first;
    }
  } else {
    msg = String(first);
  }

  if (second !== undefined) {
    msg = String(second);
  }

  if (err && msg === undefined) {
    msg = err["message"] as string;
  }

  const body: Record<string, unknown> = { ...obj };
  if (msg) body.msg = msg;
  if (err) body.err = err;

  const record: LogRecord = { body: body as LogRecord["body"] };
  if (errorType) record.attributes = { "error.type": errorType };
  return record;
};

const severityEntries = Object.entries(otelSeverityByLevel) as [
  LogLevel,
  (typeof otelSeverityByLevel)[LogLevel],
][];

export const createLogger = (otelLogger: Logger) =>
  Object.fromEntries(
    severityEntries.map(([level, severity]) => [
      level,
      (...args: unknown[]) => {
        const record = buildLogRecord(args);
        record.severityNumber = severity;
        otelLogger.emit(record);
      },
    ]),
  ) as Record<LogLevel, (...args: unknown[]) => void>;
