import { http, HttpResponse } from "msw";

const sampleTraces = [
  {
    traceId: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
    spanId: "1a2b3c4d5e6f7a8b",
    operationName: "gen_ai.chat",
    model: "gpt-4o",
    status: "OK",
    durationMs: 1234,
    startTime: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
  {
    traceId: "b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6a7",
    spanId: "2b3c4d5e6f7a8b9c",
    operationName: "gen_ai.chat",
    model: "claude-sonnet-4-6-20260310",
    status: "OK",
    durationMs: 2456,
    startTime: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    traceId: "c3d4e5f6a7b8c9d0e1f2a3b4c5d6a7b8",
    spanId: "3c4d5e6f7a8b9c0d",
    operationName: "gen_ai.chat",
    model: "gpt-4o",
    status: "ERROR",
    durationMs: 567,
    startTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    traceId: "d4e5f6a7b8c9d0e1f2a3b4c5d6a7b8c9",
    spanId: "4d5e6f7a8b9c0d1e",
    operationName: "gen_ai.chat",
    model: "groq/llama-3.3-70b",
    status: "OK",
    durationMs: 345,
    startTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    traceId: "e5f6a7b8c9d0e1f2a3b4c5d6a7b8c9d0",
    spanId: "5e6f7a8b9c0d1e2f",
    operationName: "gen_ai.embeddings",
    model: "voyage-3",
    status: "OK",
    durationMs: 189,
    startTime: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
];

function makeTraceDetail(traceId: string) {
  const summary = sampleTraces.find((t) => t.traceId === traceId) ?? sampleTraces[0]!;
  return {
    ...summary,
    endTime: new Date(new Date(summary.startTime).getTime() + summary.durationMs).toISOString(),
    provider: summary.model.includes("claude") ? "anthropic" : summary.model.includes("groq") ? "groq" : "openai",
    inputTokens: 1234,
    outputTokens: 567,
    totalTokens: 1801,
    finishReason: summary.status === "ERROR" ? "error" : "stop",
    input: JSON.stringify([
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "What is the capital of France? Please provide a detailed answer with historical context." },
    ]),
    output: "The capital of France is Paris. Paris has served as the capital since the late 10th century when Hugh Capet, the first King of the Franks of the House of Capet, made it his seat of power.",
    toolCalls: summary.operationName === "gen_ai.chat" ? [
      {
        function: {
          name: "get_weather",
          arguments: JSON.stringify({ location: "San Francisco, CA", unit: "celsius" }),
        },
        result: JSON.stringify({ temp: 18, condition: "foggy", humidity: 85 }),
      },
    ] : null,
    toolDefinitions: summary.operationName === "gen_ai.chat" ? [
      { type: "function", function: { name: "get_weather", description: "Get current weather", parameters: { type: "object", properties: { location: { type: "string" }, unit: { type: "string", enum: ["celsius", "fahrenheit"] } }, required: ["location"] } } },
      { type: "function", function: { name: "search_docs", description: "Search documentation", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } } },
    ] : null,
    requestMetadata: {
      session_id: "sess_abc123",
      user_id: "usr_456",
      environment: "staging",
    },
    raw: {
      span_attributes: {
        "gen_ai.system": "openai",
        "gen_ai.request.model": summary.model,
        "gen_ai.usage.input_tokens": 1234,
        "gen_ai.usage.output_tokens": 567,
        "gen_ai.response.finish_reasons": "stop",
        "hebo.agent.slug": "my-agent",
        "hebo.branch.slug": "main",
        "gen_ai.request.metadata.session_id": "sess_abc123",
        "gen_ai.request.metadata.user_id": "usr_456",
        "gen_ai.request.metadata.environment": "staging",
      },
      resource_attributes: {
        "service.name": "hebo-gateway",
        "service.version": "0.1.0",
      },
    },
  };
}

export const traceHandlers = [
  http.get<{ agentSlug: string; branchSlug: string }>(
    "/api/v1/agents/:agentSlug/branches/:branchSlug/traces/metadata-keys",
    () => {
      return HttpResponse.json(["session_id", "user_id", "environment", "experiment"]);
    },
  ),

  http.get<{ agentSlug: string; branchSlug: string }>(
    "/api/v1/agents/:agentSlug/branches/:branchSlug/traces/:traceId",
    ({ params }) => {
      const detail = makeTraceDetail(params.traceId as string);
      return HttpResponse.json(detail);
    },
  ),

  http.get<{ agentSlug: string; branchSlug: string }>(
    "/api/v1/agents/:agentSlug/branches/:branchSlug/traces",
    () => {
      return HttpResponse.json({
        data: sampleTraces,
        total: sampleTraces.length,
        page: 1,
        pageSize: 50,
      });
    },
  ),
];
