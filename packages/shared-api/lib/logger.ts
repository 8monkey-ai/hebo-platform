import { LOG_SEVERITY } from "../env";
import { createPinoOtelAdapter } from "../utils/otel-pino";
import { createOtelLogger } from "./otel";

export type Logger = ReturnType<typeof createPinoOtelAdapter>;

const loggers = new Map<string, Logger>();

export const getLogger = (serviceName: string): Logger => {
  let logger = loggers.get(serviceName);
  if (!logger) {
    logger = createPinoOtelAdapter(createOtelLogger(serviceName, LOG_SEVERITY));
    loggers.set(serviceName, logger);
  }
  return logger;
};
