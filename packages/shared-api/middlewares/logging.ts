import { logs } from "@opentelemetry/api-logs";
import { Elysia } from "elysia";

import { isProduction } from "../env";
import { createPinoOtelAdapter } from "../utils/otel-pino-adapter";

export type Logger = ReturnType<typeof createPinoOtelAdapter>;

export const logger = (
  serviceName: string,
  logger = createPinoOtelAdapter(logs.getLogger(serviceName)),
) => {
  const app = new Elysia({ name: "hebo-logging" }).decorate("logger", logger);

  if (!isProduction) {
    app.onRequest(({ request }) => {
      logger.info(
        { method: request.method, path: new URL(request.url).pathname },
        "request:incoming",
      );
    });
  }

  return app
    .onError(function logRequestError({ error, set }) {
      logger.error(
        {
          status: typeof set.status === "number" ? set.status : 500,
          err: error,
        },
        "request:error",
      );
    })
    .as("scoped");
};
