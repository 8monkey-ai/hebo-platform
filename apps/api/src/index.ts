import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { opentelemetry } from "@elysiajs/opentelemetry";
import { Elysia } from "elysia";

import { CORS_CONFIG } from "@hebo/shared-api/lib/cors";
import { getLogger } from "@hebo/shared-api/lib/logger";
import { createOpenapiConfig } from "@hebo/shared-api/lib/openapi";
import { getOtelConfig } from "@hebo/shared-api/lib/otel";
import { serve } from "@hebo/shared-api/lib/serve";
import { auth } from "@hebo/shared-api/middlewares/auth";
import { logging } from "@hebo/shared-api/middlewares/logging";
import { withPort } from "@hebo/shared-api/utils/url";

import { errors } from "./middlewares/errors";
import { providersModule } from "./modules/providers";
import { tracesModule } from "./modules/traces";
import { workspacesModule } from "./modules/workspaces";
import { presetsModule } from "./modules/workspaces/presets";

const PORT = Number(process.env.PORT ?? 8521);
const WORKERS = Number(process.env.WORKERS);
const BASE_URL = process.env.BASE_URL ?? "http://localhost";

const createApi = () =>
  new Elysia()
    .use(opentelemetry(getOtelConfig("hebo-api")))
    .use(logging(getLogger("hebo-api")))
    // Root route ("/") is unauthenticated and unprotected for health checks.
    .get("/", () => "🐵 Hebo API says hello!")
    .use(cors(CORS_CONFIG))
    .use(
      openapi(createOpenapiConfig("Hebo API", "Platform API", withPort(BASE_URL, PORT), "0.1.0")),
    )
    .use(auth)
    .use(errors)
    .group(
      "/v1",
      {
        isSignedIn: true,
      },
      (app) =>
        app
          // /providers
          .use(providersModule)
          // /workspaces/:workspaceSlug/presets/[:presetSlug]
          .use(workspacesModule.use(presetsModule))
          // /traces/[:traceId] (optional ?workspace=slug)
          .use(tracesModule),
    );

if (import.meta.main) {
  serve(createApi, PORT, "Hebo API", { workers: WORKERS });
}

export type Api = ReturnType<typeof createApi>;
