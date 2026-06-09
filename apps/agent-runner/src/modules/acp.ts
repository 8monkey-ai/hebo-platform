import { AgentSideConnection, type Stream } from "@agentclientprotocol/sdk";
import { Elysia, t } from "elysia";

import { auth } from "@hebo/shared-api/middlewares/auth";

import { createAgentHandler } from "~agent-runner/lib/agent-handler";

function createAcpStream(ws: { readyState: number; send(data: string): unknown }) {
  let controller: ReadableStreamDefaultController | null = null;

  const stream: Stream = {
    readable: new ReadableStream({ start: (c) => (controller = c) }),
    writable: new WritableStream({
      write: (msg) => void (ws.readyState === 1 && ws.send(JSON.stringify(msg))),
    }),
  };

  return {
    stream,
    push(data: string | object) {
      if (!controller) return;
      try {
        controller.enqueue(typeof data === "string" ? JSON.parse(data) : data);
      } catch {
        /* malformed frame */
      }
    },
    close() {
      try {
        controller?.close();
      } catch {
        /* already closed */
      }
      controller = null;
    },
  };
}

const connections = new Map<unknown, ReturnType<typeof createAcpStream>>();

export const acpModule = new Elysia().use(auth).ws("/acp", {
  isSignedIn: true,
  query: t.Object({ agent: t.String() }),

  upgrade({ set }) {
    set.headers["acp-connection-id"] = crypto.randomUUID();
  },

  open(ws) {
    const acpStream = createAcpStream(ws.raw);
    connections.set(ws.raw, acpStream);

    const connection = new AgentSideConnection(
      (conn) => createAgentHandler(conn, { agentId: ws.data.query.agent }),
      acpStream.stream,
    );

    void connection.closed.finally(() => {
      acpStream.close();
    });
  },

  message(ws, data) {
    connections.get(ws.raw)?.push(data as string | object);
  },

  close(ws) {
    connections.get(ws.raw)?.close();
    connections.delete(ws.raw);
  },
});
