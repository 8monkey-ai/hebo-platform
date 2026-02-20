import { Elysia } from "elysia";

import { isProduction, logLevel } from "../env";
import { createOtelLogger } from "../lib/otel";
import { createServiceLogger } from "../utils/otel/logger-factory";
import { getPathnameFromUrl } from "../utils/url";

export type ServiceLogger = ReturnType<typeof createServiceLogger>;

export const logger = (
  serviceName: string,
  logger = createServiceLogger(createOtelLogger(serviceName, logLevel)),
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
