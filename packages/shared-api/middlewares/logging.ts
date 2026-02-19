import { Elysia } from "elysia";

import { isProduction, logLevel } from "../env";
import { createOtelLogger } from "../lib/otel";
import { createPinoCompatibleOtelLogger } from "../utils/otel/pino-adapter";
import { getPathnameFromUrl } from "../utils/url";

export type ServiceLogger = ReturnType<typeof createPinoCompatibleOtelLogger>;

const getRequestMeta = (request: Request) => ({
  method: request.method,
  path: getPathnameFromUrl(request.url),
});

export const serviceLogging = (
  serviceName: string,
  logger = createPinoCompatibleOtelLogger(
    createOtelLogger(serviceName, logLevel),
  ),
) =>
  new Elysia({
    name: "hebo-logging",
    seed: { serviceName },
  })
    .decorate("logger", logger)
    .onRequest(function logIncomingRequest({ request }) {
      if (isProduction) return;

      logger.info(getRequestMeta(request), "request:incoming");
    })
    .onError(({ request, error, set }) => {
      logger.error(
        {
          ...getRequestMeta(request),
          status: typeof set.status === "number" ? set.status : 500,
          err: error,
        },
        "request:error",
      );
    })
    .as("scoped");
