import { SeverityNumber, type Logger, type AnyValueMap } from "@opentelemetry/api-logs";

const OTEL_SEVERITY_BY_LEVEL = {
  trace: SeverityNumber.TRACE,
  debug: SeverityNumber.DEBUG,
  info: SeverityNumber.INFO,
  warn: SeverityNumber.WARN,
  error: SeverityNumber.ERROR,
} as const;

type LogLevel = keyof typeof OTEL_SEVERITY_BY_LEVEL;
type LogRecord = Parameters<Logger["emit"]>[0];

const isRecord = (value: unknown): value is AnyValueMap =>
  typeof value === "object" && value !== null && !(value instanceof Error);

const safeString = (value: unknown) => {
  try {
    return String(value);
  } catch {
    return "[unserializable value]";
  }
};

const serializeError = (err: unknown, _seen?: WeakSet<object>) => {
  if (!(err instanceof Error)) return { message: safeString(err) };

  const seen = _seen ?? new WeakSet();
  if (seen.has(err)) return { name: err.name, message: err.message, circular: true };
  seen.add(err);

  const out: AnyValueMap = {};

  for (const k of Object.getOwnPropertyNames(err)) {
    if (k.startsWith("_")) continue;

    let val;
    try {
      val = (err as unknown as Record<string, unknown>)[k];
    } catch {
      val = "[Unreadable]";
    }

    if (typeof val === "bigint") val = `${val}n`;

    out[k] = val instanceof Error ? serializeError(val, seen) : safeString(val);
  }

  return out;
};

const buildLogRecord = (args: unknown[]): LogRecord => {
  if (args.length === 0) return {};

  const [first, second] = args;

  let obj: AnyValueMap | undefined;
  let err: Error | undefined;
  let msg: string | undefined;

  if (first instanceof Error) {
    err = first;
  } else if (isRecord(first)) {
    if (first["err"] instanceof Error) {
      err = first["err"];
      const { err: _err, ...rest } = first;
      obj = rest;
    } else {
      obj = first;
    }
  } else {
    msg = safeString(first);
  }

  if (second !== undefined) {
    msg = safeString(second);
  }

  if (err && msg === undefined) {
    msg = err.message;
  }

  const body = { ...obj };
  if (msg) body.msg = msg;
  if (err) body.err = serializeError(err);

  const record: LogRecord = { body };
  if (err) record.attributes = { "error.type": err.name };
  return record;
};

export const createPinoOtelAdapter = (otelLogger: Logger) => {
  const levels = Object.keys(OTEL_SEVERITY_BY_LEVEL) as LogLevel[];
  return Object.fromEntries(
    levels.map((level) => [
      level,
      (...args: unknown[]) => {
        const record = buildLogRecord(args);
        record.severityNumber = OTEL_SEVERITY_BY_LEVEL[level];
        record.severityText = level.toUpperCase();
        otelLogger.emit(record);
      },
    ]),
  ) as Record<LogLevel, (...args: unknown[]) => void>;
};

export const parseLogLevel = (raw: string): { level: LogLevel; severity: SeverityNumber } => {
  if (!(raw in OTEL_SEVERITY_BY_LEVEL)) {
    throw new Error(
      `Unsupported LOG_LEVEL "${raw}". Must be one of: ${Object.keys(OTEL_SEVERITY_BY_LEVEL).join(", ")}`,
    );
  }
  return { level: raw as LogLevel, severity: OTEL_SEVERITY_BY_LEVEL[raw as LogLevel] };
};
