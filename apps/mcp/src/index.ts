import { mcp } from "@8monkey/elysia-mcp";
import { opentelemetry } from "@elysiajs/opentelemetry";
import { Elysia } from "elysia";

import { getLogger } from "@hebo/shared-api/lib/logger";
import { getOtelConfig } from "@hebo/shared-api/lib/otel";
import { serve } from "@hebo/shared-api/lib/serve";
import { logging } from "@hebo/shared-api/middlewares/logging";

import { countLetterRoute } from "./aikit/count-letter.js";
import hello from "./hello.txt";

const PORT = Number(process.env.PORT ?? 8524);
const WORKERS = Number(process.env.WORKERS);

const createMcp = () =>
  new Elysia()
    .use(opentelemetry(getOtelConfig("hebo-mcp")))
    .use(logging(getLogger("hebo-mcp")))
    .use(mcp({ name: "hebo-mcp", version: "0.0.3", path: "/aikit" }))
    .get("/", () => hello, { detail: { mcp: false } })
    .group("/aikit", (app) => app.use(countLetterRoute));

if (import.meta.main) {
  serve(createMcp, PORT, "Hebo MCP", { workers: WORKERS });
}

export type Mcp = ReturnType<typeof createMcp>;
