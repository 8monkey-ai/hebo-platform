import { http, HttpResponse } from "msw";

const now = Date.now();

const mockTraces = [
  {
    timestamp: new Date(now - 2 * 60_000).toISOString(),
    duration_nano: 1_234_000_000,
    trace_id: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
    span_id: "1234567890abcdef",
    span_name: "gen_ai.chat",
    span_status_code: "STATUS_CODE_OK",
    operation_name: "chat",
    request_model: "openai/gpt-oss-20b",
    response_model: "openai/gpt-oss-20b",
    provider_name: "groq",
    input_messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "What is the capital of France?" },
    ],
    output_messages: [
      {
        role: "assistant",
        content: "The capital of France is Paris.",
      },
    ],
    response_id: "chatcmpl-abc123",
    finish_reasons: ["stop"],
    total_tokens: 42,
    input_tokens: 28,
    output_tokens: 14,
    reasoning_output_tokens: null,
  },
  {
    timestamp: new Date(now - 5 * 60_000).toISOString(),
    duration_nano: 3_456_000_000,
    trace_id: "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5",
    span_id: "abcdef1234567890",
    span_name: "gen_ai.chat",
    span_status_code: "STATUS_CODE_OK",
    operation_name: "chat",
    request_model: "openai/gpt-oss-120b",
    response_model: "openai/gpt-oss-120b",
    provider_name: "bedrock",
    input_messages: [
      { role: "system", content: "You are a code review assistant." },
      {
        role: "user",
        content:
          "Review this function:\n\nfunction fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nIs there a way to make it more efficient?",
      },
    ],
    output_messages: [
      {
        role: "assistant",
        content:
          "The recursive Fibonacci implementation has exponential time complexity O(2^n). Here are two more efficient approaches:\n\n1. **Memoization** - Cache results to avoid redundant calculations:\n```javascript\nfunction fibonacci(n, memo = {}) {\n  if (n in memo) return memo[n];\n  if (n <= 1) return n;\n  memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);\n  return memo[n];\n}\n```\n\n2. **Iterative** - O(n) time, O(1) space:\n```javascript\nfunction fibonacci(n) {\n  let a = 0, b = 1;\n  for (let i = 0; i < n; i++) {\n    [a, b] = [b, a + b];\n  }\n  return a;\n}\n```\n\nBoth approaches reduce the time complexity to O(n).",
      },
    ],
    response_id: "chatcmpl-def456",
    finish_reasons: ["stop"],
    total_tokens: 356,
    input_tokens: 89,
    output_tokens: 267,
    reasoning_output_tokens: null,
  },
  {
    timestamp: new Date(now - 12 * 60_000).toISOString(),
    duration_nano: 2_100_000_000,
    trace_id: "c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6",
    span_id: "fedcba0987654321",
    span_name: "gen_ai.chat",
    span_status_code: "STATUS_CODE_OK",
    operation_name: "chat",
    request_model: "openai/gpt-oss-120b",
    response_model: "openai/gpt-oss-120b",
    provider_name: "groq",
    input_messages: [
      { role: "system", content: "You are a helpful assistant with access to tools." },
      { role: "user", content: "What's the weather like in San Francisco?" },
    ],
    output_messages: [
      {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_abc123",
            type: "function",
            function: {
              name: "get_weather",
              arguments: '{"location": "San Francisco, CA", "unit": "celsius"}',
            },
          },
        ],
      },
    ],
    response_id: "chatcmpl-ghi789",
    finish_reasons: ["tool_calls"],
    total_tokens: 145,
    input_tokens: 98,
    output_tokens: 47,
    reasoning_output_tokens: null,
  },
  {
    timestamp: new Date(now - 30 * 60_000).toISOString(),
    duration_nano: 800_000_000,
    trace_id: "d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1",
    span_id: "0987654321fedcba",
    span_name: "gen_ai.embeddings",
    span_status_code: "STATUS_CODE_OK",
    operation_name: "embeddings",
    request_model: "voyage/voyage-3.5",
    response_model: "voyage/voyage-3.5",
    provider_name: "voyage",
    input_messages: null,
    output_messages: null,
    response_id: "emb-jkl012",
    finish_reasons: null,
    total_tokens: 128,
    input_tokens: 128,
    output_tokens: 0,
    reasoning_output_tokens: null,
  },
  {
    timestamp: new Date(now - 45 * 60_000).toISOString(),
    duration_nano: 5_000_000,
    trace_id: "e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
    span_id: "abcd1234efgh5678",
    span_name: "gen_ai.chat",
    span_status_code: "STATUS_CODE_ERROR",
    operation_name: "chat",
    request_model: "openai/gpt-oss-20b",
    response_model: null,
    provider_name: "groq",
    input_messages: [
      { role: "user", content: "Hello" },
    ],
    output_messages: null,
    response_id: null,
    finish_reasons: null,
    total_tokens: null,
    input_tokens: null,
    output_tokens: null,
    reasoning_output_tokens: null,
  },
];

export const traceHandlers = [
  // List traces
  http.get<{ agentSlug: string; branchSlug: string }>(
    "/api/v1/agents/:agentSlug/branches/:branchSlug/traces",
    ({ request }) => {
      const url = new URL(request.url);
      const page = Number(url.searchParams.get("page") ?? "1");
      const pageSize = Number(url.searchParams.get("pageSize") ?? "50");
      const start = (page - 1) * pageSize;
      const end = start + pageSize;

      return HttpResponse.json({
        data: mockTraces.slice(start, end),
        total: mockTraces.length,
        page,
        pageSize,
      });
    },
  ),

  // Get trace detail
  http.get<{ agentSlug: string; branchSlug: string; traceId: string }>(
    "/api/v1/agents/:agentSlug/branches/:branchSlug/traces/:traceId",
    ({ params }) => {
      // Don't match the metadata-keys or metadata-values routes
      if (params.traceId === "metadata-keys" || params.traceId === "metadata-values") {
        return;
      }

      const trace = mockTraces.find((t) => t.trace_id === params.traceId);
      if (!trace) {
        return new HttpResponse("Trace not found", { status: 404 });
      }
      return HttpResponse.json(trace);
    },
  ),

  // Metadata keys
  http.get<{ agentSlug: string; branchSlug: string }>(
    "/api/v1/agents/:agentSlug/branches/:branchSlug/traces/metadata-keys",
    () => {
      return HttpResponse.json(["session_id", "environment", "user_id"]);
    },
  ),

  // Metadata values
  http.get<{ agentSlug: string; branchSlug: string }>(
    "/api/v1/agents/:agentSlug/branches/:branchSlug/traces/metadata-values",
    ({ request }) => {
      const url = new URL(request.url);
      const key = url.searchParams.get("key");

      const values: Record<string, string[]> = {
        session_id: ["sess_abc123", "sess_def456"],
        environment: ["production", "staging", "development"],
        user_id: ["usr_001", "usr_002"],
      };

      return HttpResponse.json(values[key ?? ""] ?? []);
    },
  ),
];
