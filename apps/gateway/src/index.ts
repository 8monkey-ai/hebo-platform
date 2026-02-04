import { logger } from "@bogeychan/elysia-logger";
import { cors } from "@elysiajs/cors";
import { opentelemetry } from "@elysiajs/opentelemetry";
import Elysia from "elysia";

import { logLevel } from "@hebo/shared-api/env";
import { corsConfig } from "@hebo/shared-api/lib/cors";
import { getOtelConfig } from "@hebo/shared-api/lib/otel";
import { authService } from "@hebo/shared-api/middlewares/auth";

import { dbClient } from "~api/middleware/db-client";

import { basePath, gw } from "./gateway-config";
import { errorHandler } from "./middlewares/error-handler";

const PORT = Number(process.env.PORT ?? 3002);

export const createGateway = () =>
  new Elysia()
    .use(opentelemetry(getOtelConfig("hebo-gateway")))
    .use(logger({ level: logLevel }))
    // Root route ("/") is unauthenticated and unprotected for health checks.
    .get("/", () => "🐵 Hebo AI Gateway says hello!")
    .use(cors(corsConfig))
    .use(errorHandler)
    // Public routes (no authentication required)
    .all("/v1/models*", ({ request }) => gw.routes["/models"].handler(request))
    .use(authService)
    .group(basePath, { isSignedIn: true }, (app) =>
      app
        .use(dbClient)
        .all(
          `/*`,
          ({ request, dbClient }) => gw.handler(request, { dbClient }),
          { parse: "none" },
        ),
    );

if (import.meta.main) {
  const app = createGateway().listen(PORT);
  console.log(`🐵 Hebo Gateway running at ${app.server!.url}`);
}

export type Gateway = ReturnType<typeof createGateway>;
