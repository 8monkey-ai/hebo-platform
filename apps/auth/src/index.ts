import { logger } from "@bogeychan/elysia-logger";
import { cors } from "@elysiajs/cors";
import { opentelemetry } from "@elysiajs/opentelemetry";
import Elysia from "elysia";

import { corsConfig } from "@hebo/shared-api/middlewares/cors-config";
import { getOtelConfig } from "@hebo/shared-api/utils/otel";

import { auth } from "../lib/auth";

const LOG_LEVEL = process.env.LOG_LEVEL ?? "info";
const PORT = Number(process.env.PORT ?? 3000);

const createAuth = () =>
  new Elysia()
    .use(opentelemetry(getOtelConfig("hebo-auth")))
    .use(logger({ level: LOG_LEVEL }))
    .get("/", () => "🐵 Hebo Auth says hello!")
    .use(cors(corsConfig))
    .mount(auth.handler);

if (import.meta.main) {
  const app = createAuth().listen(PORT);
  console.log(`🐵 Hebo Auth running at ${app.server!.url}`);
}

export type Auth = ReturnType<typeof createAuth>;
