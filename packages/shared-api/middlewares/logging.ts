import { Elysia } from "elysia";

import { isProduction, logLevel } from "../env";
import { getOtelLogger } from "../lib/otel";
import { createLogger } from "../utils/otel/logger-adapter";
import { getPathnameFromUrl } from "../utils/url";

export type Logger = ReturnType<typeof createLogger>;

export const logger = (
  serviceName: string,
  logger = createLogger(getOtelLogger(serviceName, logLevel)),
) => {
  const app = new Elysia({ name: "hebo-logging" }).decorate("logger", logger);

  if (!isProduction) {
    app.onRequest(({ request }) => {
      logger.info(
        { method: request.method, path: getPathnameFromUrl(request.url) },
        "request:incoming",
      );
    });
  }

  return app
    .onError(({ error, set }) => {
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
