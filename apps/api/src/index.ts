import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { opentelemetry } from "@elysiajs/opentelemetry";
import { Elysia } from "elysia";

import { CORS_CONFIG } from "@hebo/shared-api/lib/cors";
import { createOpenapiConfig } from "@hebo/shared-api/lib/openapi";
import { getOtelConfig } from "@hebo/shared-api/lib/otel";
import { serve } from "@hebo/shared-api/lib/serve";
import { auth } from "@hebo/shared-api/middlewares/auth";
import { logging } from "@hebo/shared-api/middlewares/logging";

import { errors } from "./middlewares/errors";
import { agentsModule } from "./modules/agents";
import { branchesModule } from "./modules/branches";
import { providersModule } from "./modules/providers";
import { spansModule } from "./modules/traces";

const PORT = Number(process.env.PORT ?? 8521);
const API_URL = process.env.API_URL ?? `http://localhost:${PORT}`;

const createApi = () =>
  new Elysia()
    .use(opentelemetry(getOtelConfig("hebo-api")))
    .use(logging("hebo-api"))
    // Root route ("/") is unauthenticated and unprotected for health checks.
    .get("/", () => "🐵 Hebo API says hello!")
    .use(cors(CORS_CONFIG))
    .use(openapi(createOpenapiConfig("Hebo API", "Platform API", API_URL, "0.1.0")))
    .use(auth)
    .use(errors)
    .group(
      "/v1",
      {
        isSignedIn: true,
      },
      (app) =>
        app
          // /agents/[:slug]
          .use(agentsModule)
          // /agents/:slug/branches/[:slug]
          .use(branchesModule)
          // /agents/:slug/branches/:slug/traces/[:id]
          .use(spansModule)
          // /providers
          .use(providersModule),
    );

if (import.meta.main) {
  serve(createApi, PORT, "Hebo API");
}

export type Api = ReturnType<typeof createApi>;
