import {
  type AgentSideConnection,
  PROTOCOL_VERSION,
  type Agent,
  type NewSessionRequest,
} from "@agentclientprotocol/sdk";

/**
 * Stub — returns hardcoded responses for ACP methods.
 * Will be replaced by a proxy that spawns pi-acp over stdio and forwards
 * requests via ClientSideConnection (session mapping, cwd translation, MCP injection).
 */
export function createAgentHandler(_conn: AgentSideConnection, _ctx: { agentId: string }): Agent {
  const sessions = new Map<string, string>(); // contactId → sessionId

  return {
    // eslint-disable-next-line require-await
    async initialize() {
      return {
        protocolVersion: PROTOCOL_VERSION,
        agentCapabilities: {},
      };
    },
    // eslint-disable-next-line require-await
    async newSession(params: NewSessionRequest) {
      const meta = params._meta; // eslint-disable-line no-underscore-dangle
      const contactId = meta?.contactId as string | undefined;

      if (contactId) {
        const existing = sessions.get(contactId);
        if (existing) return { sessionId: existing };
      }

      const sessionId = crypto.randomUUID();
      if (contactId) sessions.set(contactId, sessionId);
      return { sessionId };
    },
    // eslint-disable-next-line require-await
    async prompt() {
      return { stopReason: "end_turn" as const };
    },
    async cancel() {},
    // eslint-disable-next-line require-await
    async authenticate() {
      return {};
    },
  };
}
