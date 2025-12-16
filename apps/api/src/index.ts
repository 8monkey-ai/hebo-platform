import { logger } from "@bogeychan/elysia-logger";
import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { opentelemetry } from "@elysiajs/opentelemetry";
import Elysia from "elysia";

import { authService } from "@hebo/shared-api/middlewares/auth/auth-service";
import { corsConfig } from "@hebo/shared-api/middlewares/cors-config";
import { initOtelFromGrafanaCloud } from "@hebo/shared-api/utils/otel";

import { errorHandler } from "./middleware/error-handler";
import { agentsModule } from "./modules/agents";
import { branchesModule } from "./modules/branches";
import { providersModule } from "./modules/providers";

const LOG_LEVEL = process.env.LOG_LEVEL ?? "info";
const PORT = Number(process.env.PORT ?? 3001);

let otelEnabled = false;

const createApi = () =>
  (otelEnabled
    ? new Elysia().use(
        opentelemetry({
          serviceName: "hebo-api",
        }),
      )
    : new Elysia()
  )
    .use(logger({ level: LOG_LEVEL }))
    // Root route ("/") is unauthenticated and unprotected for health checks.
    .get("/", () => "🐵 Hebo API says hello!")
    .use(cors(corsConfig))
    .use(
      openapi({
        // FUTURE: document security schemes
        documentation: {
          info: {
            title: "Hebo API",
            version: "0.0.1",
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
      (app) =>
        app
          // /agents and /agents/:agentSlug/branches
          .use(agentsModule.use(branchesModule))
          // /providers
          .use(providersModule),
    );

if (import.meta.main) {
  otelEnabled = await initOtelFromGrafanaCloud();
  const app = createApi().listen(PORT);
  console.log(`🐵 Hebo API running at ${app.server!.url}`);
}

export type Api = ReturnType<typeof createApi>;
