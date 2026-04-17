import { Elysia } from "elysia";

import { IS_PRODUCTION } from "../env";
import type { Logger } from "../lib/logger";

export const logging = (logger: Logger) => {
  const app = new Elysia({ name: "hebo-logging" });

  if (!IS_PRODUCTION) {
    app.onRequest(({ request }) => {
      logger.info(
        { method: request.method, path: new URL(request.url).pathname },
        "request:incoming",
      );
    });
  }

  app.onError(function logRequestError({ error, set }) {
    const status = typeof set.status === "number" ? set.status : 500;
    const log = status >= 500 ? logger.error : logger.warn;
    log.call(logger, { status, err: error }, "request:error");
  });

  return app.as("scoped");
};
