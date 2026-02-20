import {
  SeverityNumber,
  type Logger,
  type AnyValueMap,
} from "@opentelemetry/api-logs";

const otelSeverityByLevel = {
  trace: SeverityNumber.TRACE,
  debug: SeverityNumber.DEBUG,
  info: SeverityNumber.INFO,
  warn: SeverityNumber.WARN,
  error: SeverityNumber.ERROR,
} as const;

type LogLevel = keyof typeof otelSeverityByLevel;
type LogRecord = Parameters<Logger["emit"]>[0];

const isRecord = (value: unknown): value is AnyValueMap =>
  typeof value === "object" && value !== null && !(value instanceof Error);

const serializeError = (err: unknown, _seen?: WeakSet<object>) => {
  if (!(err instanceof Error)) return { message: String(err) };

  const seen = _seen ?? new WeakSet();
  if (seen.has(err))
    return { name: err.name, message: err.message, circular: true };
  seen.add(err);

  const out: AnyValueMap = {};

  for (const k of Object.getOwnPropertyNames(err)) {
    if (k.startsWith("_")) continue;

    let val;
    try {
      val = (err as unknown as AnyValueMap)[k];
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

  let obj: AnyValueMap | undefined;
  let err: Error | undefined;
  let msg: string | undefined;

  if (first instanceof Error) {
    err = first;
  } else if (isRecord(first)) {
    if (first["err"] instanceof Error) {
      err = first["err"];
      obj = { ...first };
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
    msg = err.message;
  }

  const body = { ...obj };
  if (msg) body.msg = msg;
  if (err) body.err = serializeError(err);

  const record: LogRecord = { body };
  if (err) record.attributes = { "error.type": err.name };
  return record;
};

export const createPinoAdapter = (otelLogger: Logger) => {
  const levels = Object.keys(otelSeverityByLevel) as LogLevel[];
  return Object.fromEntries(
    levels.map((level) => [
      level,
      (...args: unknown[]) => {
        const record = buildLogRecord(args);
        record.severityNumber = otelSeverityByLevel[level];
        otelLogger.emit(record);
      },
    ]),
  ) as Record<LogLevel, (...args: unknown[]) => void>;
};

export const parseLogSeverity = (raw: string): SeverityNumber => {
  if (!(raw in otelSeverityByLevel)) {
    throw new Error(
      `Unsupported LOG_LEVEL "${raw}". Must be one of: ${Object.keys(otelSeverityByLevel).join(", ")}`,
    );
  }
  return otelSeverityByLevel[raw as LogLevel];
};
