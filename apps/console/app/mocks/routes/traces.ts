import { http, HttpResponse } from "msw";

const MOCK_TRACES = [
  {
    traceId: "abc123def456789012345678",
    spanId: "span001",
    operationName: "gen_ai.chat",
    model: "gpt-4o",
    status: "OK",
    startTime: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    duration: 1234,
  },
  {
    traceId: "def456abc789012345678901",
    spanId: "span002",
    operationName: "gen_ai.chat",
    model: "claude-sonnet-4-20250514",
    status: "OK",
    startTime: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    duration: 2456,
  },
  {
    traceId: "ghi789jkl012345678901234",
    spanId: "span003",
    operationName: "gen_ai.embeddings",
    model: "text-embedding-3-small",
    status: "OK",
    startTime: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    duration: 345,
  },
  {
    traceId: "jkl012mno345678901234567",
    spanId: "span004",
    operationName: "gen_ai.chat",
    model: "gpt-4o",
    status: "ERROR",
    startTime: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    duration: 5678,
  },
  {
    traceId: "mno345pqr678901234567890",
    spanId: "span005",
    operationName: "gen_ai.chat",
    model: "claude-sonnet-4-20250514",
    status: "OK",
    startTime: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    duration: 1890,
  },
  {
    traceId: "pqr678stu901234567890123",
    spanId: "span006",
    operationName: "gen_ai.chat",
    model: "gpt-4o-mini",
    status: "OK",
    startTime: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    duration: 890,
  },
  {
    traceId: "stu901vwx234567890123456",
    spanId: "span007",
    operationName: "gen_ai.embeddings",
    model: "text-embedding-3-large",
    status: "OK",
    startTime: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    duration: 456,
  },
  {
    traceId: "vwx234yza567890123456789",
    spanId: "span008",
    operationName: "gen_ai.chat",
    model: "gpt-4o",
    status: "OK",
    startTime: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    duration: 3210,
  },
];

const MOCK_DETAILS: Record<string, object> = {
  abc123def456789012345678: {
    traceId: "abc123def456789012345678",
    spanId: "span001",
    operationName: "gen_ai.chat",
    startTime: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 2 * 60 * 1000 + 1234).toISOString(),
    duration: 1234,
    status: "OK",
    model: "gpt-4o",
    provider: "openai",
    inputTokens: 1234,
    outputTokens: 567,
    totalTokens: 1801,
    finishReason: "stop",
    inputMessages: [
      { role: "system", content: "You are a helpful assistant specializing in weather information. Always provide temperature in both Celsius and Fahrenheit." },
      { role: "user", content: "What is the weather like in San Francisco today?" },
    ],
    outputContent: "Based on the current weather data, San Francisco is experiencing mild conditions today:\n\n- Temperature: 18°C (64°F)\n- Conditions: Partly cloudy with morning fog\n- Humidity: 72%\n- Wind: 12 mph from the west\n\nThe fog should clear by midday, giving way to pleasant afternoon sunshine. It's a typical San Francisco day!",
    toolCalls: null,
    toolDefinitions: null,
    requestMetadata: {
      session_id: "sess_abc123",
      user_id: "usr_456",
      environment: "staging",
    },
    agentSlug: "my-agent",
    branchSlug: "main",
    rawSpanAttributes: {
      "gen_ai.system": "openai",
      "gen_ai.request.model": "gpt-4o",
      "gen_ai.usage.input_tokens": 1234,
      "gen_ai.usage.output_tokens": 567,
      "gen_ai.response.finish_reasons": "stop",
      "gen_ai.request.metadata.session_id": "sess_abc123",
      "gen_ai.request.metadata.user_id": "usr_456",
      "gen_ai.request.metadata.environment": "staging",
      "hebo.agent.slug": "my-agent",
      "hebo.branch.slug": "main",
    },
    rawResourceAttributes: {
      "service.name": "hebo-gateway",
      "service.version": "0.1.0",
    },
  },
  def456abc789012345678901: {
    traceId: "def456abc789012345678901",
    spanId: "span002",
    operationName: "gen_ai.chat",
    startTime: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 5 * 60 * 1000 + 2456).toISOString(),
    duration: 2456,
    status: "OK",
    model: "claude-sonnet-4-20250514",
    provider: "anthropic",
    inputTokens: 2100,
    outputTokens: 890,
    totalTokens: 2990,
    finishReason: "end_turn",
    inputMessages: [
      { role: "system", content: "You are a code review assistant." },
      { role: "user", content: "Review this function:\n\nfunction add(a, b) { return a + b; }" },
    ],
    outputContent: "This is a simple addition function. A few suggestions:\n\n1. **Type safety**: Consider adding TypeScript types for the parameters\n2. **Input validation**: You might want to check that both arguments are numbers\n3. **Naming**: The function name is clear and descriptive\n\nOverall, it's clean and functional for basic use cases.",
    toolCalls: null,
    toolDefinitions: null,
    requestMetadata: {
      session_id: "sess_def456",
      environment: "production",
    },
    agentSlug: "my-agent",
    branchSlug: "main",
    rawSpanAttributes: {
      "gen_ai.system": "anthropic",
      "gen_ai.request.model": "claude-sonnet-4-20250514",
      "gen_ai.usage.input_tokens": 2100,
      "gen_ai.usage.output_tokens": 890,
      "gen_ai.response.finish_reasons": "end_turn",
      "gen_ai.request.metadata.session_id": "sess_def456",
      "gen_ai.request.metadata.environment": "production",
      "hebo.agent.slug": "my-agent",
      "hebo.branch.slug": "main",
    },
    rawResourceAttributes: {
      "service.name": "hebo-gateway",
      "service.version": "0.1.0",
    },
  },
  jkl012mno345678901234567: {
    traceId: "jkl012mno345678901234567",
    spanId: "span004",
    operationName: "gen_ai.chat",
    startTime: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 25 * 60 * 1000 + 5678).toISOString(),
    duration: 5678,
    status: "ERROR",
    model: "gpt-4o",
    provider: "openai",
    inputTokens: 3200,
    outputTokens: 0,
    totalTokens: 3200,
    finishReason: "error",
    inputMessages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Search the web for the latest news about AI regulations." },
    ],
    outputContent: null,
    toolCalls: [
      {
        id: "call_abc123",
        function: {
          name: "web_search",
          arguments: '{"query": "latest AI regulations 2026", "limit": 5}',
        },
      },
    ],
    toolDefinitions: [
      {
        type: "function",
        function: {
          name: "web_search",
          description: "Search the web for information",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query" },
              limit: { type: "number", description: "Max results" },
            },
            required: ["query"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "get_page",
          description: "Fetch a web page",
          parameters: {
            type: "object",
            properties: {
              url: { type: "string" },
            },
            required: ["url"],
          },
        },
      },
    ],
    requestMetadata: {
      session_id: "sess_error",
      environment: "staging",
    },
    agentSlug: "my-agent",
    branchSlug: "main",
    rawSpanAttributes: {
      "gen_ai.system": "openai",
      "gen_ai.request.model": "gpt-4o",
      "gen_ai.usage.input_tokens": 3200,
      "gen_ai.usage.output_tokens": 0,
      "gen_ai.response.finish_reasons": "error",
      "gen_ai.request.metadata.session_id": "sess_error",
      "gen_ai.request.metadata.environment": "staging",
      "hebo.agent.slug": "my-agent",
      "hebo.branch.slug": "main",
      "error.type": "timeout",
      "error.message": "Request timed out after 30s",
    },
    rawResourceAttributes: {
      "service.name": "hebo-gateway",
      "service.version": "0.1.0",
    },
  },
  mno345pqr678901234567890: {
    traceId: "mno345pqr678901234567890",
    spanId: "span005",
    operationName: "gen_ai.chat",
    startTime: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 45 * 60 * 1000 + 1890).toISOString(),
    duration: 1890,
    status: "OK",
    model: "claude-sonnet-4-20250514",
    provider: "anthropic",
    inputTokens: 1500,
    outputTokens: 400,
    totalTokens: 1900,
    finishReason: "end_turn",
    inputMessages: [
      { role: "system", content: "You are a helpful assistant with access to tools." },
      { role: "user", content: "What's the weather in Paris?" },
      {
        role: "tool",
        content: '{"temp": 22, "condition": "sunny", "humidity": 45}',
      },
    ],
    outputContent: "The weather in Paris is currently sunny with a temperature of 22°C. Humidity is at 45%, making it a pleasant day to be outdoors!",
    toolCalls: [
      {
        id: "call_weather_1",
        function: {
          name: "get_weather",
          arguments: '{"location": "Paris, France", "unit": "celsius"}',
        },
      },
    ],
    toolDefinitions: [
      {
        type: "function",
        function: {
          name: "get_weather",
          description: "Get current weather for a location",
          parameters: {
            type: "object",
            properties: {
              location: { type: "string" },
              unit: { type: "string", enum: ["celsius", "fahrenheit"] },
            },
            required: ["location"],
          },
        },
      },
    ],
    requestMetadata: {
      session_id: "sess_tools",
      user_id: "usr_789",
      environment: "production",
    },
    agentSlug: "my-agent",
    branchSlug: "main",
    rawSpanAttributes: {
      "gen_ai.system": "anthropic",
      "gen_ai.request.model": "claude-sonnet-4-20250514",
      "gen_ai.usage.input_tokens": 1500,
      "gen_ai.usage.output_tokens": 400,
      "gen_ai.response.finish_reasons": "end_turn",
      "gen_ai.request.metadata.session_id": "sess_tools",
      "gen_ai.request.metadata.user_id": "usr_789",
      "gen_ai.request.metadata.environment": "production",
      "hebo.agent.slug": "my-agent",
      "hebo.branch.slug": "main",
    },
    rawResourceAttributes: {
      "service.name": "hebo-gateway",
      "service.version": "0.1.0",
    },
  },
};

// Fallback detail generator for traces without explicit mock detail
function generateFallbackDetail(traceId: string) {
  const trace = MOCK_TRACES.find((t) => t.traceId === traceId);
  if (!trace) return null;

  return {
    traceId: trace.traceId,
    spanId: trace.spanId,
    operationName: trace.operationName,
    startTime: trace.startTime,
    endTime: new Date(new Date(trace.startTime).getTime() + trace.duration).toISOString(),
    duration: trace.duration,
    status: trace.status,
    model: trace.model,
    provider: trace.model.includes("claude") ? "anthropic" : trace.model.includes("embed") ? "openai" : "openai",
    inputTokens: Math.floor(Math.random() * 2000) + 200,
    outputTokens: trace.operationName.includes("embed") ? undefined : Math.floor(Math.random() * 800) + 50,
    totalTokens: undefined,
    finishReason: trace.status === "OK" ? "stop" : "error",
    inputMessages: trace.operationName.includes("embed")
      ? null
      : [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Hello, can you help me with a task?" },
        ],
    outputContent: trace.operationName.includes("embed") ? null : "Of course! I'd be happy to help. What would you like assistance with?",
    toolCalls: null,
    toolDefinitions: null,
    requestMetadata: { environment: "staging" },
    agentSlug: "my-agent",
    branchSlug: "main",
    rawSpanAttributes: {
      "gen_ai.system": trace.model.includes("claude") ? "anthropic" : "openai",
      "gen_ai.request.model": trace.model,
      "hebo.agent.slug": "my-agent",
      "hebo.branch.slug": "main",
    },
    rawResourceAttributes: {
      "service.name": "hebo-gateway",
      "service.version": "0.1.0",
    },
  };
}

const BASE = "/api/v1/agents/:agentSlug/branches/:branchSlug/traces";

export const traceHandlers = [
  http.get(BASE, async ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? 1);
    const pageSize = Number(url.searchParams.get("pageSize") ?? 50);
    const offset = (page - 1) * pageSize;

    const data = MOCK_TRACES.slice(offset, offset + pageSize);

    return HttpResponse.json({
      data,
      total: MOCK_TRACES.length,
      page,
      pageSize,
    });
  }),

  http.get(`${BASE}/metadata-keys`, async () => {
    return HttpResponse.json(["session_id", "user_id", "environment"]);
  }),

  http.get(`${BASE}/metadata-values`, async ({ request }) => {
    const url = new URL(request.url);
    const key = url.searchParams.get("key");

    const values: Record<string, string[]> = {
      session_id: ["sess_abc123", "sess_def456", "sess_error", "sess_tools"],
      user_id: ["usr_456", "usr_789"],
      environment: ["staging", "production"],
    };

    return HttpResponse.json(values[key ?? ""] ?? []);
  }),

  http.get<{ traceId: string }>(`${BASE}/:traceId`, async ({ params }) => {
    const detail = MOCK_DETAILS[params.traceId] ?? generateFallbackDetail(params.traceId);

    if (!detail) {
      return new HttpResponse("Trace not found", { status: 404 });
    }

    return HttpResponse.json(detail);
  }),
];
