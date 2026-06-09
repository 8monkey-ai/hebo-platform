import { cors } from "@elysia/cors";
import { opentelemetry } from "@elysia/opentelemetry";
import { Elysia } from "elysia";

import { CORS_CONFIG } from "@hebo/shared-api/lib/cors";
import { getLogger } from "@hebo/shared-api/lib/logger";
import { getOtelConfig } from "@hebo/shared-api/lib/otel";
import { serve } from "@hebo/shared-api/lib/serve";
import { logging } from "@hebo/shared-api/middlewares/logging";

import { acpModule } from "./modules/acp";

const PORT = Number(process.env.PORT ?? 8525);
const WORKERS = Number(process.env.WORKERS);

const createApp = () =>
  new Elysia()
    .use(opentelemetry(getOtelConfig("hebo-agent-runner")))
    .use(logging(getLogger("hebo-agent-runner")))
    .get("/", () => "🐵 Hebo Agent Runner says hello!")
    .use(cors(CORS_CONFIG))
    .use(acpModule);

if (import.meta.main) {
  serve(createApp, PORT, "Hebo Agent Runner", { idleTimeout: 0, workers: WORKERS });
}

export type AgentRunner = ReturnType<typeof createApp>;
