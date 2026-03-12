import { http, HttpResponse } from "msw";

const now = Date.now();
const min = 60 * 1000;

const mockTraces = [
  {
    timestamp: new Date(now - 3 * min).toISOString(),
    traceId: "2fd9c1ab-f4d0-48b0-a1e3-8c5f2d3b4a6e",
    spanId: "a1b2c3d4e5f60001",
    operationName: "chat",
    model: "gpt-oss-120b",
    provider: "openai",
    status: "ok",
    durationMs: 842,
    summary:
      "The cheapest flight from Kuala Lumpur to Tokyo Narita is with AirAsia for $187 on March 20th.",
  },
  {
    timestamp: new Date(now - 6 * min).toISOString(),
    traceId: "7a2b3c4d-e5f6-7890-abcd-ef1234567890",
    spanId: "a1b2c3d4e5f60002",
    operationName: "chat",
    model: "gpt-4.1",
    provider: "openai",
    status: "ok",
    durationMs: 1234,
    summary: "Based on the documentation, the deployment process involves three steps...",
  },
  {
    timestamp: new Date(now - 12 * min).toISOString(),
    traceId: "3c4d5e6f-7890-abcd-ef12-345678901234",
    spanId: "a1b2c3d4e5f60003",
    operationName: "chat",
    model: "claude-sonnet-4-20250514",
    provider: "anthropic",
    status: "error",
    durationMs: 2834,
    summary: "",
  },
  {
    timestamp: new Date(now - 18 * min).toISOString(),
    traceId: "4d5e6f70-8901-bcde-f123-456789012345",
    spanId: "a1b2c3d4e5f60004",
    operationName: "chat",
    model: "gpt-oss-20b",
    provider: "openai",
    status: "ok",
    durationMs: 456,
    summary: "Hello! How can I help you today?",
  },
  {
    timestamp: new Date(now - 25 * min).toISOString(),
    traceId: "5e6f7081-9012-cdef-0123-567890123456",
    spanId: "a1b2c3d4e5f60005",
    operationName: "embeddings",
    model: "voyage-3.5",
    provider: "voyage",
    status: "ok",
    durationMs: 89,
    summary: "",
  },
];

const mockTraceDetails: Record<string, object> = {
  "2fd9c1ab-f4d0-48b0-a1e3-8c5f2d3b4a6e": {
    timestamp: mockTraces[0]!.timestamp,
    timestampEnd: new Date(new Date(mockTraces[0]!.timestamp).getTime() + 842).toISOString(),
    traceId: "2fd9c1ab-f4d0-48b0-a1e3-8c5f2d3b4a6e",
    spanId: "a1b2c3d4e5f60001",
    spanName: "gen_ai.chat",
    operationName: "chat",
    model: "gpt-oss-120b",
    responseModel: "gpt-oss-120b-2026-03-01",
    provider: "openai",
    status: "ok",
    statusMessage: "",
    durationMs: 842,
    inputTokens: 912,
    outputTokens: 372,
    totalTokens: 1284,
    reasoningTokens: null,
    inputMessages: [
      {
        role: "system",
        content:
          "You are a helpful travel assistant. You help users find the cheapest flights and best travel options. Use the search_flights tool to look up available flights.",
      },
      {
        role: "user",
        content: "Find me the cheapest flight from Kuala Lumpur to Tokyo Narita for March 20th",
      },
    ],
    outputMessages: [
      {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            function: {
              name: "search_flights",
              arguments: JSON.stringify({
                from: "KUL",
                to: "NRT",
                date: "2026-03-20",
                sort: "price_asc",
              }),
            },
          },
        ],
      },
      {
        role: "tool",
        name: "search_flights",
        content: JSON.stringify({
          flights: [
            {
              airline: "AirAsia",
              price: 187,
              departure: "06:30",
              arrival: "14:45",
              duration: "7h 15m",
            },
            {
              airline: "Malaysia Airlines",
              price: 312,
              departure: "09:00",
              arrival: "17:15",
              duration: "7h 15m",
            },
            {
              airline: "JAL",
              price: 445,
              departure: "11:30",
              arrival: "19:45",
              duration: "7h 15m",
            },
          ],
        }),
      },
      {
        role: "assistant",
        content:
          "The cheapest flight from Kuala Lumpur to Tokyo Narita is with AirAsia for $187 on March 20th. It departs at 06:30 and arrives at 14:45 (7h 15m flight). Other options include Malaysia Airlines at $312 and JAL at $445. Would you like me to help you book the AirAsia flight?",
      },
    ],
    finishReasons: ["stop"],
    responseId: "chatcmpl-abc123def456",
    metadata: {
      session_id: "sess_abc123",
      environment: "production",
      user_id: "usr_456",
    },
    spanAttributes: {
      "gen_ai.operation.name": "chat",
      "gen_ai.request.model": "gpt-oss-120b",
      "gen_ai.response.model": "gpt-oss-120b-2026-03-01",
      "gen_ai.provider.name": "openai",
      "gen_ai.usage.input_tokens": 912,
      "gen_ai.usage.output_tokens": 372,
      "gen_ai.usage.total_tokens": 1284,
      "gen_ai.response.id": "chatcmpl-abc123def456",
      "gen_ai.response.finish_reasons": ["stop"],
      "gen_ai.request.metadata.session_id": "sess_abc123",
      "gen_ai.request.metadata.environment": "production",
      "gen_ai.request.metadata.user_id": "usr_456",
      "hebo.agent.slug": "my-agent",
      "hebo.branch.slug": "main",
    },
    resourceAttributes: {
      "service.name": "hebo-gateway",
      "telemetry.sdk.language": "nodejs",
      "telemetry.sdk.name": "opentelemetry",
    },
  },
  "7a2b3c4d-e5f6-7890-abcd-ef1234567890": {
    timestamp: mockTraces[1]!.timestamp,
    timestampEnd: new Date(new Date(mockTraces[1]!.timestamp).getTime() + 1234).toISOString(),
    traceId: "7a2b3c4d-e5f6-7890-abcd-ef1234567890",
    spanId: "a1b2c3d4e5f60002",
    spanName: "gen_ai.chat",
    operationName: "chat",
    model: "gpt-4.1",
    responseModel: "gpt-4.1-2026-04-14",
    provider: "openai",
    status: "ok",
    statusMessage: "",
    durationMs: 1234,
    inputTokens: 2048,
    outputTokens: 1536,
    totalTokens: 3584,
    reasoningTokens: 512,
    inputMessages: [
      {
        role: "system",
        content: "You are a technical documentation assistant.",
      },
      {
        role: "user",
        content: "How do I deploy using the new CI/CD pipeline?",
      },
    ],
    outputMessages: [
      {
        role: "assistant",
        content: [
          {
            type: "reasoning",
            text: "The user is asking about deployment with the CI/CD pipeline. I should refer to the deployment docs and provide step-by-step instructions.",
          },
          {
            type: "text",
            text: "Based on the documentation, the deployment process involves three steps:\n\n1. **Push to main** - Merge your PR to the main branch\n2. **CI validates** - The pipeline runs tests, linting, and type checks\n3. **Auto-deploy** - SST deploys to staging, then promotes to production after approval\n\nYou can monitor the deployment status in the GitHub Actions tab.",
          },
        ],
      },
    ],
    finishReasons: ["stop"],
    responseId: "chatcmpl-def789ghi012",
    metadata: {
      session_id: "sess_def456",
      environment: "staging",
    },
    spanAttributes: {
      "gen_ai.operation.name": "chat",
      "gen_ai.request.model": "gpt-4.1",
      "gen_ai.response.model": "gpt-4.1-2026-04-14",
      "gen_ai.provider.name": "openai",
      "gen_ai.usage.input_tokens": 2048,
      "gen_ai.usage.output_tokens": 1536,
      "gen_ai.usage.total_tokens": 3584,
      "gen_ai.usage.reasoning.output_tokens": 512,
      "gen_ai.response.id": "chatcmpl-def789ghi012",
      "gen_ai.response.finish_reasons": ["stop"],
      "gen_ai.request.metadata.session_id": "sess_def456",
      "gen_ai.request.metadata.environment": "staging",
      "hebo.agent.slug": "my-agent",
      "hebo.branch.slug": "main",
    },
    resourceAttributes: {
      "service.name": "hebo-gateway",
      "telemetry.sdk.language": "nodejs",
    },
  },
  "3c4d5e6f-7890-abcd-ef12-345678901234": {
    timestamp: mockTraces[2]!.timestamp,
    timestampEnd: new Date(new Date(mockTraces[2]!.timestamp).getTime() + 2834).toISOString(),
    traceId: "3c4d5e6f-7890-abcd-ef12-345678901234",
    spanId: "a1b2c3d4e5f60003",
    spanName: "gen_ai.chat",
    operationName: "chat",
    model: "claude-sonnet-4-20250514",
    responseModel: "claude-sonnet-4-20250514",
    provider: "anthropic",
    status: "error",
    statusMessage: "Rate limit exceeded",
    durationMs: 2834,
    inputTokens: 4096,
    outputTokens: 0,
    totalTokens: 4096,
    reasoningTokens: null,
    inputMessages: [
      {
        role: "user",
        content: "Analyze this dataset and provide recommendations for optimization.",
      },
    ],
    outputMessages: [],
    finishReasons: [],
    responseId: "",
    metadata: {
      session_id: "sess_ghi789",
      environment: "production",
    },
    spanAttributes: {
      "gen_ai.operation.name": "chat",
      "gen_ai.request.model": "claude-sonnet-4-20250514",
      "gen_ai.response.model": "claude-sonnet-4-20250514",
      "gen_ai.provider.name": "anthropic",
      "gen_ai.usage.input_tokens": 4096,
      "gen_ai.usage.output_tokens": 0,
      "gen_ai.usage.total_tokens": 4096,
      "error.type": "RateLimitError",
      "error.stack": "RateLimitError: Rate limit exceeded\n    at ...",
      "hebo.agent.slug": "my-agent",
      "hebo.branch.slug": "main",
    },
    resourceAttributes: {
      "service.name": "hebo-gateway",
    },
  },
  "4d5e6f70-8901-bcde-f123-456789012345": {
    timestamp: mockTraces[3]!.timestamp,
    timestampEnd: new Date(new Date(mockTraces[3]!.timestamp).getTime() + 456).toISOString(),
    traceId: "4d5e6f70-8901-bcde-f123-456789012345",
    spanId: "a1b2c3d4e5f60004",
    spanName: "gen_ai.chat",
    operationName: "chat",
    model: "gpt-oss-20b",
    responseModel: "gpt-oss-20b",
    provider: "openai",
    status: "ok",
    statusMessage: "",
    durationMs: 456,
    inputTokens: 128,
    outputTokens: 64,
    totalTokens: 192,
    reasoningTokens: null,
    inputMessages: [
      { role: "system", content: "You are a friendly assistant." },
      { role: "user", content: "Hello!" },
    ],
    outputMessages: [
      {
        role: "assistant",
        content: "Hello! How can I help you today?",
      },
    ],
    finishReasons: ["stop"],
    responseId: "chatcmpl-jkl345mno678",
    metadata: {
      environment: "staging",
    },
    spanAttributes: {
      "gen_ai.operation.name": "chat",
      "gen_ai.request.model": "gpt-oss-20b",
      "gen_ai.provider.name": "openai",
      "gen_ai.usage.input_tokens": 128,
      "gen_ai.usage.output_tokens": 64,
      "gen_ai.usage.total_tokens": 192,
      "gen_ai.request.metadata.environment": "staging",
      "hebo.agent.slug": "my-agent",
      "hebo.branch.slug": "main",
    },
    resourceAttributes: {
      "service.name": "hebo-gateway",
    },
  },
  "5e6f7081-9012-cdef-0123-567890123456": {
    timestamp: mockTraces[4]!.timestamp,
    timestampEnd: new Date(new Date(mockTraces[4]!.timestamp).getTime() + 89).toISOString(),
    traceId: "5e6f7081-9012-cdef-0123-567890123456",
    spanId: "a1b2c3d4e5f60005",
    spanName: "gen_ai.embeddings",
    operationName: "embeddings",
    model: "voyage-3.5",
    responseModel: "voyage-3.5",
    provider: "voyage",
    status: "ok",
    statusMessage: "",
    durationMs: 89,
    inputTokens: 256,
    outputTokens: null,
    totalTokens: 256,
    reasoningTokens: null,
    inputMessages: [],
    outputMessages: [],
    finishReasons: [],
    responseId: "emb-pqr901stu234",
    metadata: {
      environment: "production",
    },
    spanAttributes: {
      "gen_ai.operation.name": "embeddings",
      "gen_ai.request.model": "voyage-3.5",
      "gen_ai.provider.name": "voyage",
      "gen_ai.usage.input_tokens": 256,
      "gen_ai.usage.total_tokens": 256,
      "gen_ai.request.metadata.environment": "production",
      "hebo.agent.slug": "my-agent",
      "hebo.branch.slug": "main",
    },
    resourceAttributes: {
      "service.name": "hebo-gateway",
    },
  },
};

export const traceHandlers = [
  // List traces
  http.get<{ agentSlug: string; branchSlug: string }>(
    "/api/v1/agents/:agentSlug/branches/:branchSlug/traces",
    async ({ request }) => {
      const url = new URL(request.url);

      // Handle metadata-tags sub-route
      if (url.pathname.endsWith("/metadata-tags")) {
        return HttpResponse.json({
          tags: {
            session_id: ["sess_abc123", "sess_def456", "sess_ghi789"],
            environment: ["production", "staging"],
            user_id: ["usr_456"],
          },
        });
      }

      const page = Number(url.searchParams.get("page") ?? 1);
      const pageSize = Number(url.searchParams.get("pageSize") ?? 50);

      // Apply metadata filters
      let filtered = [...mockTraces];
      for (const [key, value] of url.searchParams.entries()) {
        if (key.startsWith("meta.")) {
          const metaKey = key.slice(5);
          filtered = filtered.filter((t) => {
            const detail = mockTraceDetails[t.traceId] as any;
            return detail?.metadata?.[metaKey] === value;
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

  // Metadata tags
  http.get<{ agentSlug: string; branchSlug: string }>(
    "/api/v1/agents/:agentSlug/branches/:branchSlug/traces/metadata-tags",
    async () => {
      return HttpResponse.json({
        tags: {
          session_id: ["sess_abc123", "sess_def456", "sess_ghi789"],
          environment: ["production", "staging"],
          user_id: ["usr_456"],
        },
      });
    },
  ),

  // Get trace detail
  http.get<{ agentSlug: string; branchSlug: string; traceId: string }>(
    "/api/v1/agents/:agentSlug/branches/:branchSlug/traces/:traceId",
    async ({ params }) => {
      const detail = mockTraceDetails[params.traceId];
      if (!detail) {
        return new HttpResponse("Trace not found", { status: 404 });
      }
      return HttpResponse.json(detail);
    },
  ),
];
