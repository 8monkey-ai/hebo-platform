import { http, HttpResponse } from "msw";

const MOCK_TRACES = [
  {
    traceId: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
    spanId: "1a2b3c4d5e6f7a8b",
    operationName: "gen_ai.chat",
    model: "gpt-oss-20b",
    status: "ok",
    startTime: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 2 * 60 * 1000 + 1230).toISOString(),
    durationMs: 1230,
    spanAttributes: {
      "gen_ai.system": "groq",
      "gen_ai.request.model": "gpt-oss-20b",
      "gen_ai.usage.input_tokens": 1234,
      "gen_ai.usage.output_tokens": 567,
      "gen_ai.usage.total_tokens": 1801,
      "gen_ai.response.finish_reasons": "stop",
      "gen_ai.request.messages": JSON.stringify([
        { role: "system", content: "You are a helpful assistant that specializes in weather forecasting and travel advice. Always provide detailed, actionable information." },
        { role: "user", content: "What's the weather like in San Francisco today? I'm planning a trip." },
      ]),
      "gen_ai.response.text": "San Francisco today is partly cloudy with temperatures around 62°F (17°C). The fog has cleared for the afternoon, making it a great time to visit the Golden Gate Bridge or walk along the Embarcadero. I'd recommend layering up as temperatures can drop quickly in the evening.",
      "gen_ai.response.tool_calls": null,
      "gen_ai.request.tools": null,
      "gen_ai.request.metadata.session_id": "sess_abc123",
      "gen_ai.request.metadata.environment": "staging",
      "gen_ai.request.metadata.user_id": "usr_456",
      "hebo.agent.slug": "my-agent",
      "hebo.branch.slug": "main",
    },
    resourceAttributes: {
      "service.name": "hebo-gateway",
      "service.version": "0.6.2",
    },
  },
  {
    traceId: "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5",
    spanId: "2b3c4d5e6f7a8b9c",
    operationName: "gen_ai.chat",
    model: "gpt-oss-120b",
    status: "ok",
    startTime: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 5 * 60 * 1000 + 3450).toISOString(),
    durationMs: 3450,
    spanAttributes: {
      "gen_ai.system": "bedrock",
      "gen_ai.request.model": "gpt-oss-120b",
      "gen_ai.usage.input_tokens": 2345,
      "gen_ai.usage.output_tokens": 890,
      "gen_ai.usage.total_tokens": 3235,
      "gen_ai.response.finish_reasons": "tool_calls",
      "gen_ai.request.messages": JSON.stringify([
        { role: "system", content: "You are a coding assistant. Use available tools to help users." },
        { role: "user", content: "Find the current stock price of AAPL and convert it to EUR." },
      ]),
      "gen_ai.response.text": null,
      "gen_ai.response.tool_calls": JSON.stringify([
        { function: { name: "get_stock_price", arguments: '{"symbol": "AAPL"}' }, id: "call_001" },
        { function: { name: "convert_currency", arguments: '{"amount": 178.50, "from": "USD", "to": "EUR"}' }, id: "call_002" },
      ]),
      "gen_ai.request.tools": JSON.stringify([
        { function: { name: "get_stock_price", parameters: { type: "object", properties: { symbol: { type: "string" } } } } },
        { function: { name: "convert_currency", parameters: { type: "object", properties: { amount: { type: "number" }, from: { type: "string" }, to: { type: "string" } } } } },
        { function: { name: "search_web", parameters: { type: "object", properties: { query: { type: "string" } } } } },
      ]),
      "gen_ai.request.metadata.session_id": "sess_def789",
      "gen_ai.request.metadata.environment": "staging",
      "hebo.agent.slug": "my-agent",
      "hebo.branch.slug": "main",
    },
    resourceAttributes: {
      "service.name": "hebo-gateway",
      "service.version": "0.6.2",
    },
  },
  {
    traceId: "c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6",
    spanId: "3c4d5e6f7a8b9c0d",
    operationName: "gen_ai.embeddings",
    model: "voyage-3.5",
    status: "ok",
    startTime: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 12 * 60 * 1000 + 180).toISOString(),
    durationMs: 180,
    spanAttributes: {
      "gen_ai.system": "voyage",
      "gen_ai.request.model": "voyage-3.5",
      "gen_ai.usage.input_tokens": 512,
      "gen_ai.usage.output_tokens": 0,
      "gen_ai.usage.total_tokens": 512,
      "gen_ai.response.finish_reasons": null,
      "gen_ai.request.messages": null,
      "gen_ai.response.text": null,
      "gen_ai.request.metadata.environment": "production",
      "hebo.agent.slug": "my-agent",
      "hebo.branch.slug": "main",
    },
    resourceAttributes: {
      "service.name": "hebo-gateway",
      "service.version": "0.6.2",
    },
  },
  {
    traceId: "d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1",
    spanId: "4d5e6f7a8b9c0d1e",
    operationName: "gen_ai.chat",
    model: "claude-opus-4-6",
    status: "error",
    startTime: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 25 * 60 * 1000 + 5100).toISOString(),
    durationMs: 5100,
    spanAttributes: {
      "gen_ai.system": "bedrock",
      "gen_ai.request.model": "claude-opus-4-6",
      "gen_ai.usage.input_tokens": 4500,
      "gen_ai.usage.output_tokens": 0,
      "gen_ai.usage.total_tokens": 4500,
      "gen_ai.response.finish_reasons": "error",
      "gen_ai.request.messages": JSON.stringify([
        { role: "system", content: "You are a data analysis assistant." },
        { role: "user", content: "Analyze the quarterly revenue trends from our database and generate a comprehensive report with visualizations." },
        { role: "assistant", content: "I'll analyze the quarterly revenue data for you. Let me query the database first." },
        { role: "tool", content: '{"error": "Connection timeout after 5000ms"}' },
      ]),
      "gen_ai.response.text": null,
      "gen_ai.request.metadata.session_id": "sess_ghi012",
      "gen_ai.request.metadata.environment": "staging",
      "gen_ai.request.metadata.experiment": "v2-analysis",
      "hebo.agent.slug": "my-agent",
      "hebo.branch.slug": "main",
    },
    resourceAttributes: {
      "service.name": "hebo-gateway",
      "service.version": "0.6.2",
    },
  },
  {
    traceId: "e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
    spanId: "5e6f7a8b9c0d1e2f",
    operationName: "gen_ai.chat",
    model: "gpt-oss-20b",
    status: "ok",
    startTime: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 45 * 60 * 1000 + 890).toISOString(),
    durationMs: 890,
    spanAttributes: {
      "gen_ai.system": "groq",
      "gen_ai.request.model": "gpt-oss-20b",
      "gen_ai.usage.input_tokens": 456,
      "gen_ai.usage.output_tokens": 234,
      "gen_ai.usage.total_tokens": 690,
      "gen_ai.response.finish_reasons": "stop",
      "gen_ai.request.messages": JSON.stringify([
        { role: "user", content: "Translate 'Hello, how are you?' to French, German, and Japanese." },
      ]),
      "gen_ai.response.text": "Here are the translations:\n\n**French:** Bonjour, comment allez-vous ?\n**German:** Hallo, wie geht es Ihnen?\n**Japanese:** こんにちは、お元気ですか？",
      "gen_ai.request.metadata.session_id": "sess_abc123",
      "gen_ai.request.metadata.environment": "production",
      "hebo.agent.slug": "my-agent",
      "hebo.branch.slug": "main",
    },
    resourceAttributes: {
      "service.name": "hebo-gateway",
      "service.version": "0.6.2",
    },
  },
];

function extractDetail(trace: (typeof MOCK_TRACES)[number]) {
  const attrs = trace.spanAttributes;
  const prefix = "gen_ai.request.metadata.";
  const requestMetadata: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith(prefix)) {
      requestMetadata[key.slice(prefix.length)] = value;
    }
  }

  return {
    ...trace,
    provider: attrs["gen_ai.system"] ?? "",
    inputTokens: attrs["gen_ai.usage.input_tokens"] ?? null,
    outputTokens: attrs["gen_ai.usage.output_tokens"] ?? null,
    totalTokens: attrs["gen_ai.usage.total_tokens"] ?? null,
    finishReason: attrs["gen_ai.response.finish_reasons"] ?? null,
    inputMessages: attrs["gen_ai.request.messages"] ?? null,
    outputContent: attrs["gen_ai.response.text"] ?? null,
    toolCalls: attrs["gen_ai.response.tool_calls"] ?? null,
    toolDefinitions: attrs["gen_ai.request.tools"] ?? null,
    requestMetadata,
  };
}

export const traceHandlers = [
  http.get<{ agentSlug: string; branchSlug: string }>(
    "/api/v1/agents/:agentSlug/branches/:branchSlug/traces",
    async ({ request }) => {
      const url = new URL(request.url);
      const page = Number(url.searchParams.get("page") ?? "1");
      const pageSize = Number(url.searchParams.get("pageSize") ?? "50");
      const metadataStr = url.searchParams.get("metadata");

      let filtered = [...MOCK_TRACES];

      // Apply metadata filters
      if (metadataStr) {
        const filters = metadataStr.split(",").map((entry) => {
          const [key, ...rest] = entry.split(":");
          return { key, value: rest.join(":") };
        });
        filtered = filtered.filter((trace) =>
          filters.every(
            (f) =>
              trace.spanAttributes[`gen_ai.request.metadata.${f.key}`] === f.value,
          ),
        );
      }

      const start = (page - 1) * pageSize;
      const data = filtered.slice(start, start + pageSize);

      return HttpResponse.json({
        data,
        total: filtered.length,
        page,
        pageSize,
      });
    },
  ),

  http.get<{ agentSlug: string; branchSlug: string; traceId: string }>(
    "/api/v1/agents/:agentSlug/branches/:branchSlug/traces/metadata-keys",
    async () => {
      const keys = new Set<string>();
      const prefix = "gen_ai.request.metadata.";
      for (const trace of MOCK_TRACES) {
        for (const key of Object.keys(trace.spanAttributes)) {
          if (key.startsWith(prefix)) {
            keys.add(key.slice(prefix.length));
          }
        }
      }
      return HttpResponse.json(Array.from(keys).sort());
    },
  ),

  http.get<{ agentSlug: string; branchSlug: string }>(
    "/api/v1/agents/:agentSlug/branches/:branchSlug/traces/metadata-values",
    async ({ request }) => {
      const url = new URL(request.url);
      const key = url.searchParams.get("key");
      if (!key) return HttpResponse.json([]);

      const values = new Set<string>();
      const attrKey = `gen_ai.request.metadata.${key}`;
      for (const trace of MOCK_TRACES) {
        const val = trace.spanAttributes[attrKey];
        if (val != null) values.add(String(val));
      }
      return HttpResponse.json(Array.from(values).sort());
    },
  ),

  http.get<{ agentSlug: string; branchSlug: string; traceId: string }>(
    "/api/v1/agents/:agentSlug/branches/:branchSlug/traces/:traceId",
    async ({ params }) => {
      const trace = MOCK_TRACES.find((t) => t.traceId === params.traceId);
      if (!trace) return new HttpResponse("Not found", { status: 404 });
      return HttpResponse.json(extractDetail(trace));
    },
  ),
];
