import { logger } from "@bogeychan/elysia-logger";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import Elysia from "elysia";

import { countLetterTool } from "./aikit/count-letter.js";
import { createMcpHandler } from "./aikit/mcp-transport.js";

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
    .get("/", () => Bun.file("./hello.txt").text())
    .group("/aikit", (app) =>
      app.post("/", async ({ request, body }) =>
        createMcpHandler(mcpServer)(request, body),
      ),
    );

if (import.meta.main) {
  const app = createApp().listen(PORT);
  console.log(`🐵 Hebo MCP running at ${app.server!.url}`);
}

export type McpApp = ReturnType<typeof createApp>;
