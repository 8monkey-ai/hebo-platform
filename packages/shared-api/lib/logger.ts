import { LOG_SEVERITY } from "../env";
import { createPinoOtelAdapter } from "../utils/otel-pino";
import { createOtelLogger } from "./otel";

export type Logger = ReturnType<typeof createPinoOtelAdapter>;

export const createLogger = (serviceName: string): Logger =>
  createPinoOtelAdapter(createOtelLogger(serviceName, LOG_SEVERITY));
