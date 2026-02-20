import { cors } from "@elysiajs/cors";
import { opentelemetry } from "@elysiajs/opentelemetry";
import Elysia from "elysia";

import { corsConfig } from "@hebo/shared-api/lib/cors";
import { createOtelConfig } from "@hebo/shared-api/lib/otel";
import { logger } from "@hebo/shared-api/middlewares/logging";

import { auth } from "./better-auth";

const PORT = Number(process.env.PORT ?? 3000);

const createAuth = () =>
  new Elysia()
    .use(opentelemetry(createOtelConfig("hebo-auth")))
    .use(logger("hebo-auth"))
    .get("/", () => "🐵 Hebo Auth says hello!")
    .use(cors(corsConfig))
    .mount(auth.handler);

if (import.meta.main) {
  const app = createAuth().listen(PORT);
  console.log(`🐵 Hebo Auth running at ${app.server!.url}`);
}

export type Auth = ReturnType<typeof createAuth>;
