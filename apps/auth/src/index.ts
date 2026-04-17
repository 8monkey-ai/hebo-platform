import { cors } from "@elysiajs/cors";
import { opentelemetry } from "@elysiajs/opentelemetry";
import { Elysia } from "elysia";

import { CORS_CONFIG } from "@hebo/shared-api/lib/cors";
import { getLogger } from "@hebo/shared-api/lib/logger";
import { getOtelConfig } from "@hebo/shared-api/lib/otel";
import { serve } from "@hebo/shared-api/lib/serve";
import { logging } from "@hebo/shared-api/middlewares/logging";

import { auth } from "./better-auth";

const PORT = Number(process.env.PORT ?? 8523);
const WORKERS = Number(process.env.WORKERS);

const createAuth = () =>
  new Elysia()
    .use(opentelemetry(getOtelConfig("hebo-auth")))
    .use(logging(getLogger("hebo-auth")))
    .get("/", () => "🐵 Hebo Auth says hello!")
    .use(cors(CORS_CONFIG))
    .mount(auth.handler);

if (import.meta.main) {
  serve(createAuth, PORT, "Hebo Auth", { workers: WORKERS });
}

export type Auth = ReturnType<typeof createAuth>;
