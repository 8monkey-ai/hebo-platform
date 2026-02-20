import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { opentelemetry } from "@elysiajs/opentelemetry";
import Elysia from "elysia";

import { corsConfig } from "@hebo/shared-api/lib/cors";
import { getOpenapiConfig } from "@hebo/shared-api/lib/openapi";
import { createOtelConfig } from "@hebo/shared-api/lib/otel";
import { authService } from "@hebo/shared-api/middlewares/auth";
import { logger } from "@hebo/shared-api/middlewares/logging";

import { errorHandler } from "./middleware/error-handler";
import { agentsModule } from "./modules/agents";
import { branchesModule } from "./modules/branches";
import { providersModule } from "./modules/providers";

const PORT = Number(process.env.PORT ?? 3001);
const API_URL = process.env.API_URL ?? `http://localhost:${PORT}`;

const createApi = () =>
  new Elysia()
    .use(opentelemetry(createOtelConfig("hebo-api")))
    .use(logger("hebo-api"))
    // Root route ("/") is unauthenticated and unprotected for health checks.
    .get("/", () => "🐵 Hebo API says hello!")
    .use(cors(corsConfig))
    .use(
      openapi(getOpenapiConfig("Hebo API", "Platform API", API_URL, "0.1.0")),
    )
    .use(authService)
    .use(errorHandler)
    .group(
      "/v1",
      {
        isSignedIn: true,
      },
      (app) =>
        app
          // /agents and /agents/:agentSlug/branches
          .use(agentsModule.use(branchesModule))
          // /providers
          .use(providersModule),
    );

if (import.meta.main) {
  const app = createApi().listen(PORT);
  console.log(`🐵 Hebo API running at ${app.server!.url}`);
}

export type Api = ReturnType<typeof createApi>;
