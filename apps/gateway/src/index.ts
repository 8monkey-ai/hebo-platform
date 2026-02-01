import { logger } from "@bogeychan/elysia-logger";
import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { opentelemetry } from "@elysiajs/opentelemetry";
import Elysia from "elysia";

import { logLevel } from "@hebo/shared-api/env";
import { corsConfig } from "@hebo/shared-api/lib/cors";
import { getOtelConfig } from "@hebo/shared-api/lib/otel";
import { authService } from "@hebo/shared-api/middlewares/auth";

import { errorHandler } from "./middlewares/error-handler";
import { completions } from "./modules/completions";
import { embeddings } from "./modules/embeddings";
import { models } from "./modules/models";

const PORT = Number(process.env.PORT ?? 3002);

export const createGateway = () =>
  new Elysia()
    .use(opentelemetry(getOtelConfig("hebo-gateway")))
    .use(logger({ level: logLevel }))
    // Root route ("/") is unauthenticated and unprotected for health checks.
    .get("/", () => "🐵 Hebo AI Gateway says hello!")
    .use(cors(corsConfig))
    .use(
      openapi({
        // FUTURE: document security schemes
        documentation: {
          info: {
            title: "Hebo AI Gateway",
            version: "0.1.0",
          },
        },
      }),
    )
    .use(authService)
    .use(errorHandler)
    .group(
      "/v1",
      {
        isSignedIn: true,
      },
      (app) => app.use(completions).use(embeddings),
    )
    // Public routes (no authentication required)
    .group("/v1", (app) => app.use(models));

if (import.meta.main) {
  const app = createGateway().listen(PORT);
  console.log(`🐵 Hebo Gateway running at ${app.server!.url}`);
}

export type Gateway = ReturnType<typeof createGateway>;
