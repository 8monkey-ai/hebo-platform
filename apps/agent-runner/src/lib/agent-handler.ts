import { type AgentSideConnection, PROTOCOL_VERSION, type Agent } from "@agentclientprotocol/sdk";

/**
 * Stub — returns hardcoded responses for ACP methods.
 * Will be replaced by a proxy that spawns pi-acp over stdio and forwards
 * requests via ClientSideConnection (session mapping, cwd translation, MCP injection).
 */
export function createAgentHandler(_conn: AgentSideConnection, _ctx: { agentId: string }): Agent {
  return {
    // eslint-disable-next-line require-await
    async initialize() {
      return {
        protocolVersion: PROTOCOL_VERSION,
        agentCapabilities: {},
      };
    },
    // eslint-disable-next-line require-await
    async newSession() {
      return { sessionId: crypto.randomUUID() };
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
