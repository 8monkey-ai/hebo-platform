import { logger } from "@bogeychan/elysia-logger";
import { opentelemetry } from "@elysiajs/opentelemetry";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import Elysia from "elysia";

import { getOtelConfig } from "@hebo/shared-api/lib/otel";

import { countLetterTool } from "./aikit/count-letter.js";
import hello from "./hello.txt";

const LOG_LEVEL = process.env.LOG_LEVEL ?? "info";
const PORT = Number(process.env.PORT ?? 3003);

const mcp = new McpServer({ name: "hebo-mcp", version: "0.0.2" });
mcp.registerTool(
  countLetterTool.name,
  countLetterTool.config,
  countLetterTool.handler,
);

const createMcp = () =>
  new Elysia()
    .use(opentelemetry(getOtelConfig("hebo-mcp")))
    .use(logger({ level: LOG_LEVEL }))
    .get("/", () => hello)
    .group("/aikit", (app) =>
      app.mount("/", async (request) => {
        const transport = new WebStandardStreamableHTTPServerTransport();
        await mcp.connect(transport);
        return transport.handleRequest(request);
      }),
    );

if (import.meta.main) {
  const mcp = createMcp().listen(PORT);
  console.log(`🐵 Hebo MCP running at ${mcp.server!.url}`);
}

export type Mcp = ReturnType<typeof createMcp>;
