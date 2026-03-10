import { http, HttpResponse } from "msw";

const MOCK_TRACES = [
  {
    traceId: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
    spanId: "1a2b3c4d5e6f7a8b",
    operationName: "gen_ai.chat",
    model: "gpt-4o",
    statusCode: 1,
    startTime: new Date(Date.now() - 2 * 60_000).toISOString(),
    endTime: new Date(Date.now() - 2 * 60_000 + 1230).toISOString(),
    durationMs: 1230,
  },
  {
    traceId: "b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6a7",
    spanId: "2b3c4d5e6f7a8b9c",
    operationName: "gen_ai.chat",
    model: "claude-sonnet-4-20250514",
    statusCode: 1,
    startTime: new Date(Date.now() - 5 * 60_000).toISOString(),
    endTime: new Date(Date.now() - 5 * 60_000 + 2450).toISOString(),
    durationMs: 2450,
  },
  {
    traceId: "c3d4e5f6a7b8c9d0e1f2a3b4c5d6a7b8",
    spanId: "3c4d5e6f7a8b9c0d",
    operationName: "gen_ai.embeddings",
    model: "text-embedding-3-small",
    statusCode: 1,
    startTime: new Date(Date.now() - 8 * 60_000).toISOString(),
    endTime: new Date(Date.now() - 8 * 60_000 + 180).toISOString(),
    durationMs: 180,
  },
  {
    traceId: "d4e5f6a7b8c9d0e1f2a3b4c5d6a7b8c9",
    spanId: "4d5e6f7a8b9c0d1e",
    operationName: "gen_ai.chat",
    model: "gpt-4o",
    statusCode: 2,
    startTime: new Date(Date.now() - 15 * 60_000).toISOString(),
    endTime: new Date(Date.now() - 15 * 60_000 + 5200).toISOString(),
    durationMs: 5200,
  },
  {
    traceId: "e5f6a7b8c9d0e1f2a3b4c5d6a7b8c9d0",
    spanId: "5e6f7a8b9c0d1e2f",
    operationName: "gen_ai.chat",
    model: "claude-sonnet-4-20250514",
    statusCode: 1,
    startTime: new Date(Date.now() - 22 * 60_000).toISOString(),
    endTime: new Date(Date.now() - 22 * 60_000 + 3100).toISOString(),
    durationMs: 3100,
  },
];

const MOCK_TRACE_DETAILS: Record<string, object> = {
  a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6: {
    traceId: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
    spanId: "1a2b3c4d5e6f7a8b",
    operationName: "gen_ai.chat",
    model: "gpt-4o",
    provider: "openai",
    statusCode: 1,
    startTime: new Date(Date.now() - 2 * 60_000).toISOString(),
    endTime: new Date(Date.now() - 2 * 60_000 + 1230).toISOString(),
    durationMs: 1230,
    inputTokens: 1234,
    outputTokens: 567,
    totalTokens: 1801,
    finishReason: "stop",
    inputMessages: [
      { role: "system", content: "You are a helpful assistant that provides concise, accurate answers. Always cite sources when possible." },
      { role: "user", content: "What is the capital of France? Also, can you tell me about its population and major landmarks?" },
    ],
    outputContent: "The capital of France is Paris. It has a population of approximately 2.1 million people in the city proper (about 12.5 million in the metropolitan area). Major landmarks include the Eiffel Tower, the Louvre Museum, Notre-Dame Cathedral, and the Arc de Triomphe.",
    toolCalls: null,
    toolDefinitions: null,
    requestMetadata: {
      session_id: "sess_abc123",
      user_id: "usr_456",
      environment: "staging",
    },
    rawAttributes: {
      "gen_ai.system": "openai",
      "gen_ai.request.model": "gpt-4o",
      "gen_ai.response.model": "gpt-4o-2025-03-01",
      "gen_ai.usage.input_tokens": 1234,
      "gen_ai.usage.output_tokens": 567,
      "gen_ai.response.finish_reasons": "stop",
      "gen_ai.request.metadata.session_id": "sess_abc123",
      "gen_ai.request.metadata.user_id": "usr_456",
      "gen_ai.request.metadata.environment": "staging",
      "hebo.agent.slug": "my-agent",
      "hebo.branch.slug": "main",
    },
  },
  b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6a7: {
    traceId: "b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6a7",
    spanId: "2b3c4d5e6f7a8b9c",
    operationName: "gen_ai.chat",
    model: "claude-sonnet-4-20250514",
    provider: "anthropic",
    statusCode: 1,
    startTime: new Date(Date.now() - 5 * 60_000).toISOString(),
    endTime: new Date(Date.now() - 5 * 60_000 + 2450).toISOString(),
    durationMs: 2450,
    inputTokens: 890,
    outputTokens: 1200,
    totalTokens: 2090,
    finishReason: "end_turn",
    inputMessages: [
      { role: "system", content: "You are an AI assistant with access to tools. Use them when needed." },
      { role: "user", content: "What's the weather in San Francisco and find me the top 3 restaurants there?" },
    ],
    outputContent: "Based on the weather in San Francisco (18°C, foggy as usual!) and my search results, here are the top 3 restaurants:\n\n1. **State Bird Provisions** - Innovative Californian cuisine\n2. **Tartine Manufactory** - Artisan bakery and cafe\n3. **Zuni Café** - Classic San Francisco dining",
    toolCalls: [
      { name: "get_weather", arguments: '{"location": "San Francisco, CA", "unit": "celsius"}', result: '{"temp": 18, "condition": "foggy", "humidity": 82}', id: "call_abc123" },
      { name: "search_restaurants", arguments: '{"city": "San Francisco", "limit": 3, "sort_by": "rating"}', result: '{"results": [{"name": "State Bird Provisions", "rating": 4.8}, {"name": "Tartine Manufactory", "rating": 4.7}, {"name": "Zuni Café", "rating": 4.6}]}', id: "call_def456" },
    ],
    toolDefinitions: [
      { type: "function", function: { name: "get_weather", description: "Get current weather for a location", parameters: { type: "object", properties: { location: { type: "string" }, unit: { type: "string", enum: ["celsius", "fahrenheit"] } }, required: ["location"] } } },
      { type: "function", function: { name: "search_restaurants", description: "Search for restaurants in a city", parameters: { type: "object", properties: { city: { type: "string" }, limit: { type: "number" }, sort_by: { type: "string" } }, required: ["city"] } } },
    ],
    requestMetadata: {
      session_id: "sess_def789",
      environment: "staging",
    },
    rawAttributes: {
      "gen_ai.system": "anthropic",
      "gen_ai.request.model": "claude-sonnet-4-20250514",
      "gen_ai.usage.input_tokens": 890,
      "gen_ai.usage.output_tokens": 1200,
      "gen_ai.response.finish_reasons": "end_turn",
      "gen_ai.request.metadata.session_id": "sess_def789",
      "gen_ai.request.metadata.environment": "staging",
      "hebo.agent.slug": "my-agent",
      "hebo.branch.slug": "main",
    },
  },
  d4e5f6a7b8c9d0e1f2a3b4c5d6a7b8c9: {
    traceId: "d4e5f6a7b8c9d0e1f2a3b4c5d6a7b8c9",
    spanId: "4d5e6f7a8b9c0d1e",
    operationName: "gen_ai.chat",
    model: "gpt-4o",
    provider: "openai",
    statusCode: 2,
    startTime: new Date(Date.now() - 15 * 60_000).toISOString(),
    endTime: new Date(Date.now() - 15 * 60_000 + 5200).toISOString(),
    durationMs: 5200,
    inputTokens: 4500,
    outputTokens: 0,
    totalTokens: 4500,
    finishReason: "error",
    inputMessages: [
      { role: "system", content: "You are a code review assistant." },
      { role: "user", content: "Review the following code:\n\n```python\ndef fibonacci(n):\n    if n <= 0:\n        return []\n    elif n == 1:\n        return [0]\n    elif n == 2:\n        return [0, 1]\n    fib = [0, 1]\n    for i in range(2, n):\n        fib.append(fib[i-1] + fib[i-2])\n    return fib\n```" },
    ],
    outputContent: null,
    toolCalls: null,
    toolDefinitions: null,
    requestMetadata: {
      environment: "production",
    },
    rawAttributes: {
      "gen_ai.system": "openai",
      "gen_ai.request.model": "gpt-4o",
      "gen_ai.usage.input_tokens": 4500,
      "gen_ai.response.finish_reasons": "error",
      "gen_ai.request.metadata.environment": "production",
      "hebo.agent.slug": "my-agent",
      "hebo.branch.slug": "main",
    },
  },
};

// Default detail for traces without a custom mock
function makeDefaultDetail(trace: (typeof MOCK_TRACES)[number]) {
  return {
    ...trace,
    provider: "openai",
    inputTokens: 500,
    outputTokens: 200,
    totalTokens: 700,
    finishReason: "stop",
    inputMessages: [
      { role: "user", content: "Hello, how are you?" },
    ],
    outputContent: "I'm doing well, thank you for asking!",
    toolCalls: null,
    toolDefinitions: null,
    requestMetadata: {},
    rawAttributes: {
      "gen_ai.system": "openai",
      "gen_ai.request.model": trace.model,
      "hebo.agent.slug": "my-agent",
      "hebo.branch.slug": "main",
    },
  };
}

export const traceHandlers = [
  http.get<{ agentSlug: string; branchSlug: string }>(
    "/api/v1/agents/:agentSlug/branches/:branchSlug/traces/metadata-keys",
    () => {
      return HttpResponse.json(["session_id", "user_id", "environment"]);
    },
  ),

  http.get<{ agentSlug: string; branchSlug: string }>(
    "/api/v1/agents/:agentSlug/branches/:branchSlug/traces/metadata-values",
    ({ request }) => {
      const url = new URL(request.url);
      const key = url.searchParams.get("key");
      const values: Record<string, string[]> = {
        session_id: ["sess_abc123", "sess_def789", "sess_ghi012"],
        user_id: ["usr_456", "usr_789"],
        environment: ["staging", "production", "development"],
      };
      return HttpResponse.json(values[key ?? ""] ?? []);
    },
  ),

  http.get<{ agentSlug: string; branchSlug: string; traceId: string }>(
    "/api/v1/agents/:agentSlug/branches/:branchSlug/traces/:traceId",
    ({ params }) => {
      const detail = MOCK_TRACE_DETAILS[params.traceId];
      if (detail) {
        return HttpResponse.json(detail);
      }
      // Create a default detail from the mock list
      const summary = MOCK_TRACES.find((t) => t.traceId === params.traceId);
      if (summary) {
        return HttpResponse.json(makeDefaultDetail(summary));
      }
      return new HttpResponse("Trace not found", { status: 404 });
    },
  ),

  http.get<{ agentSlug: string; branchSlug: string }>(
    "/api/v1/agents/:agentSlug/branches/:branchSlug/traces",
    ({ request }) => {
      const url = new URL(request.url);
      const page = Number(url.searchParams.get("page") ?? "1");
      const pageSize = Number(url.searchParams.get("pageSize") ?? "50");

      // Apply metadata filters
      let filtered = [...MOCK_TRACES];
      for (const [key, value] of url.searchParams.entries()) {
        if (key.startsWith("meta.")) {
          const metaKey = key.slice(5);
          filtered = filtered.filter((t) => {
            const detail = MOCK_TRACE_DETAILS[t.traceId] as { requestMetadata?: Record<string, string> } | undefined;
            return detail?.requestMetadata?.[metaKey] === value;
          });
        }
      }

      const start = (page - 1) * pageSize;
      const paged = filtered.slice(start, start + pageSize);

      return HttpResponse.json({
        data: paged,
        total: filtered.length,
        page,
        pageSize,
      });
    },
  ),
];
