import { logger } from "@bogeychan/elysia-logger";
import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import Elysia from "elysia";

import { authService } from "@hebo/shared-api/middlewares/auth/auth-service";
import { corsConfig } from "@hebo/shared-api/middlewares/cors-config";

import { errorHandler } from "./middlewares/error-handler";
import { completions } from "./modules/completions";
import { embeddings } from "./modules/embeddings";
import { models } from "./modules/models";

const LOG_LEVEL = process.env.LOG_LEVEL ?? "info";
const PORT = Number(process.env.PORT ?? 3002);

export const createGateway = () =>
  new Elysia()
    .use(logger({ level: LOG_LEVEL }))
    // Root route ("/") is unauthenticated and unprotected for health checks.
    .get("/", () => "🐵 Hebo AI Gateway says hello!")
    .use(cors(corsConfig))
    .use(
      openapi({
        // FUTURE: document security schemes
        documentation: {
          info: {
            title: "Hebo AI Gateway",
            version: "0.0.1",
          },
        },
      }),
    )
    .use(authService)
    .use(errorHandler)
    .group("/v1", (app) =>
      app
        .guard({ isSignedIn: true }, (app) =>
          app.use(completions).use(embeddings),
        )
        .use(models),
    );

if (import.meta.main) {
  const app = createGateway().listen(PORT);
  console.log(`🐵 Hebo Gateway running at ${app.server!.url}`);
}

export type Gateway = ReturnType<typeof createGateway>;
