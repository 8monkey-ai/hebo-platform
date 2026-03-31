import { Elysia } from "elysia";

import { IS_PRODUCTION, LOG_SEVERITY } from "../env";
import { getOtelLogger } from "../lib/otel";
import { createPinoOtelAdapter } from "../utils/otel-pino";

export type Logger = ReturnType<typeof createPinoOtelAdapter>;

export const logging = (serviceName?: string) => {
  const logger = serviceName
    ? createPinoOtelAdapter(getOtelLogger(serviceName, LOG_SEVERITY))
    : ({} as Logger);
  const app = new Elysia({ name: "hebo-logging" }).decorate("logger", logger);

  if (!serviceName) return app.as("scoped");

  if (!IS_PRODUCTION) {
    app.onRequest(({ request }) => {
      logger.info(
        { method: request.method, path: new URL(request.url).pathname },
        "request:incoming",
      );
    });
  }

  app.onError(function logRequestError({ error, set }) {
    logger.error(
      {
        status: typeof set.status === "number" ? set.status : 500,
        err: error,
      },
      "request:error",
    );
  });

  return app.as("scoped");
};
