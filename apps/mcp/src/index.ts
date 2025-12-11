import { logger } from "@bogeychan/elysia-logger";
import { staticPlugin } from "@elysiajs/static";
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

const createApp = async () =>
  new Elysia()
    .use(logger({ level: LOG_LEVEL }))
    .use(await staticPlugin({ prefix: "/", assets: "src/ui/" }))
    .group("/aikit", (app) =>
      app
        .get("/", () => "🐵 Hebo Aikit MCP server says hello!")
        .post("/", async ({ request, body }) =>
          createMcpHandler(mcpServer)(request, body),
        ),
    );

if (import.meta.main) {
  // eslint-disable-next-line unicorn/no-await-expression-member
  const app = (await createApp()).listen(PORT);
  console.log(`🐵 Hebo MCP running at ${app.server!.url}`);
}
