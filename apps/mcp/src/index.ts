import { logger } from "@bogeychan/elysia-logger";
import { staticPlugin } from "@elysiajs/static";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import Elysia from "elysia";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

import { countLetterTool } from "./aikit/count-letter.js";
import { createMcpHandler } from "./aikit/mcp-transport.js";
import { Home } from "./ui/root";

const LOG_LEVEL = process.env.LOG_LEVEL ?? "info";
const PORT = Number(process.env.PORT ?? 3003);

const mcpServer = new McpServer({ name: "hebo-mcp", version: "0.0.1" });
mcpServer.registerTool(
  countLetterTool.name,
  countLetterTool.config,
  countLetterTool.handler,
);

const createApp = () =>
  new Elysia()
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
  const app = createApp().listen(PORT);
  console.log(`🐵 Hebo MCP running at ${app.server!.url}`);
}

export type McpApp = ReturnType<typeof createApp>;
