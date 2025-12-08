import { PassThrough, Readable, Writable } from "node:stream";

import { createPinoLogger } from "@bogeychan/elysia-logger";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { IncomingMessage, ServerResponse } from "node:http";

const logger = createPinoLogger({ level: process.env.LOG_LEVEL ?? "info" });

async function doCleanup(transport: StreamableHTTPServerTransport) {
  try {
    await transport.close();
  } catch (error) {
    logger.error({ error }, "Error closing transport");
  }
}

function toIncomingMessage(request: Request): IncomingMessage {
  const url = new URL(request.url);
  const headers = Object.fromEntries(request.headers.entries());

  return Object.assign(
    new Readable({
      read() {
        // eslint-disable-next-line unicorn/no-null -- Node streams API requires null to signal EOF
        this.push(null);
      },
    }),
    {
      method: request.method,
      url: url.pathname + url.search,
      headers,
      httpVersion: "1.1",
      httpVersionMajor: 1,
      httpVersionMinor: 1,
    },
  ) as unknown as IncomingMessage;
}

function createResponseShim() {
  const body = new PassThrough();
  const state = {
    statusCode: 200,
    headers: {} as Record<string, string | string[]>,
  };

  const res = Object.assign(
    new Writable({
      write: (chunk, enc, cb) => body.write(chunk, enc, cb),
      final: (cb) => body.end(cb),
    }),
    {
      statusCode: 200,
      headersSent: false,
      setHeader(k: string, v: string | string[]) {
        state.headers[k.toLowerCase()] = v;
        return this;
      },
      getHeader(k: string) {
        return state.headers[k.toLowerCase()];
      },
      writeHead(
        code: number,
        headersOrMsg?: string | Record<string, string | string[]>,
        headers?: Record<string, string | string[]>,
      ) {
        state.statusCode = code;
        this.statusCode = code;
        this.headersSent = true;
        const h = typeof headersOrMsg === "object" ? headersOrMsg : headers;
        if (h)
          for (const [k, v] of Object.entries(h))
            state.headers[k.toLowerCase()] = v;
        return this;
      },
      on(event: string, handler: () => void) {
        if (event === "close" || event === "finish") body.on(event, handler);
        return this;
      },
    },
  ) as unknown as ServerResponse;

  return { res, body, state };
}

const toWebStream = (stream: PassThrough): ReadableStream<Uint8Array> =>
  new ReadableStream({
    start(ctrl) {
      stream.on("data", (chunk: Buffer) => ctrl.enqueue(new Uint8Array(chunk)));
      stream.on("end", () => ctrl.close());
      stream.on("error", (e) => ctrl.error(e));
    },
    cancel() {
      stream.destroy();
    },
  });

export function createMcpHandler(server: McpServer) {
  return async (request: Request, body: unknown): Promise<Response> => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // Stateless: no session management
    });
    const { res, body: responseBody, state } = createResponseShim();

    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      doCleanup(transport).catch((error) =>
        logger.error({ error }, "Cleanup failed"),
      );
    };

    responseBody.on("finish", cleanup);
    responseBody.on("error", cleanup);

    try {
      await server.connect(transport);
      await transport.handleRequest(toIncomingMessage(request), res, body);

      const headers = new Headers();
      for (const [k, v] of Object.entries(state.headers)) {
        if (Array.isArray(v)) {
          for (const val of v) headers.append(k, val);
        } else {
          headers.set(k, v);
        }
      }

      return new Response(toWebStream(responseBody), {
        status: state.statusCode,
        headers,
      });
    } catch (error) {
      logger.error({ error }, "Error handling MCP request");
      cleanup();

      return Response.json(
        {
          jsonrpc: "2.0",
          // JSON-RPC 2.0 error codes: https://www.jsonrpc.org/specification#error_object
          error: { code: -32_603, message: "Internal server error" },
          // eslint-disable-next-line unicorn/no-null -- JSON-RPC 2.0 spec requires null for unknown id
          id: null,
        },
        { status: 500 },
      );
    }
  };
}
