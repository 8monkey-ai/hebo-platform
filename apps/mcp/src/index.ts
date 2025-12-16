import { logger } from "@bogeychan/elysia-logger";
import { opentelemetry } from "@elysiajs/opentelemetry";
import { staticPlugin } from "@elysiajs/static";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import Elysia from "elysia";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

import { initOtelFromGrafanaCloud } from "@hebo/shared-api/utils/otel";

import { countLetterTool } from "./aikit/count-letter.js";
import { createMcpHandler } from "./aikit/mcp-transport.js";
import { Home } from "./ui/root";

const LOG_LEVEL = process.env.LOG_LEVEL ?? "info";
const PORT = Number(process.env.PORT ?? 3003);

let otelEnabled = false;

const mcpServer = new McpServer({ name: "hebo-mcp", version: "0.0.1" });
mcpServer.registerTool(
  countLetterTool.name,
  countLetterTool.config,
  countLetterTool.handler,
);

const createApp = () =>
  (otelEnabled
    ? new Elysia().use(
        opentelemetry({
          serviceName: "hebo-mcp",
        }),
      )
    : new Elysia()
  )
    .use(logger({ level: LOG_LEVEL }))
    .use(staticPlugin({ assets: "src/ui/public" }))
    .use(staticPlugin({ assets: "dist", prefix: "/static" }))
    .get("/", () => {
      const html = renderToString(createElement(Home));
      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
    })
    .group("/aikit", (app) =>
      app
        .get("/", () => "🐵 Hebo Aikit MCP server says hello!")
        .post("/", async ({ request, body }) =>
          createMcpHandler(mcpServer)(request, body),
        ),
    );

if (import.meta.main) {
  otelEnabled = await initOtelFromGrafanaCloud();
  const app = createApp().listen(PORT);
  console.log(`🐵 Hebo MCP running at ${app.server!.url}`);
}

export type McpApp = ReturnType<typeof createApp>;
