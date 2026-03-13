import { http, HttpResponse } from "msw";
import { z } from "zod";

const now = Date.now();
const min = 60 * 1000;
const longFlightNarrative = [
  "I checked multiple fare buckets, nearby departure windows, and whether baggage pricing changed the effective total cost.",
  "I prioritized direct flights first, then reviewed one-stop options only when they reduced the fare by a meaningful amount.",
  "I also compared early-morning departures with mid-day flights because some budget carriers shift prices aggressively across the day.",
  "When the cheapest itinerary had stricter change rules, I called that out so the recommendation was still practical and not just numerically cheapest.",
  "Weather risk and airport transfer time were considered as tie-breakers because they materially affect whether the plan is actually usable.",
  "I kept the explanation intentionally detailed so the detail pane has enough content to demonstrate independent scrolling behavior.",
].join("\n\n");

const longToolPayload = {
  flights: Array.from({ length: 12 }).map((_, index) => ({
    airline: index % 3 === 0 ? "AirAsia X" : index % 3 === 1 ? "Malaysia Airlines" : "JAL",
    flight_number: `HX ${510 + index}`,
    cabin: index % 2 === 0 ? "Economy" : "Premium Economy",
    departure: `2026-03-20T${String(7 + index).padStart(2, "0")}:30:00`,
    arrival: `2026-03-20T${String(14 + index).padStart(2, "0")}:45:00`,
    duration: `${7 + (index % 3)}h ${15 + index}m`,
    price_usd: 187 + index * 23,
    baggage: index % 2 === 0 ? "20kg included" : "Carry-on only",
    notes:
      "Mock payload intentionally expanded to force internal scrolling in the trace detail panel.",
  })),
};

const mockTraces = [
  {
    timestamp: new Date(now - 3 * min).toISOString(),
    spanId: "2fd9c1ab-f4d0-48b0-a1e3-8c5f2d3b4a6e",
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
    spanId: "7a2b3c4d-e5f6-7890-abcd-ef1234567890",
    operationName: "chat",
    model: "gpt-4.1",
    provider: "openai",
    status: "ok",
    durationMs: 1234,
    summary: "Based on the documentation, the deployment process involves three steps...",
  },
  {
    timestamp: new Date(now - 12 * min).toISOString(),
    spanId: "3c4d5e6f-7890-abcd-ef12-345678901234",
    operationName: "chat",
    model: "claude-sonnet-4-20250514",
    provider: "anthropic",
    status: "error",
    durationMs: 2834,
    summary: "",
  },
  {
    timestamp: new Date(now - 18 * min).toISOString(),
    spanId: "4d5e6f70-8901-bcde-f123-456789012345",
    operationName: "chat",
    model: "gpt-oss-20b",
    provider: "openai",
    status: "ok",
    durationMs: 456,
    summary: "Hello! How can I help you today?",
  },
  {
    timestamp: new Date(now - 25 * min).toISOString(),
    spanId: "5e6f7081-9012-cdef-0123-567890123456",
    operationName: "embeddings",
    model: "voyage-3.5",
    provider: "voyage",
    status: "ok",
    durationMs: 89,
    summary: "",
  },
];

const generatedMockTraces = Array.from({ length: 18 }).map((_, index) => {
  const timestamp = new Date(now - (30 + index * 4) * min).toISOString();
  const spanId = `90000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
  const provider = index % 3 === 0 ? "openai" : index % 3 === 1 ? "anthropic" : "google";
  const model =
    provider === "openai"
      ? "gpt-oss-120b"
      : provider === "anthropic"
        ? "claude-sonnet-4-20250514"
        : "gemini-2.5-pro";
  const status = index % 5 === 0 ? "error" : "ok";
  const operationName = index % 4 === 0 ? "response.create" : "chat.completion";

  return {
    timestamp,
    spanId,
    operationName,
    model,
    provider,
    status,
    durationMs: 620 + index * 87,
    summary:
      status === "error"
        ? "Provider timeout after a long tool-augmented reasoning pass. User-safe fallback was not emitted."
        : "Expanded mock trace generated to make the list scroll region obvious while keeping realistic-looking summaries.",
  };
});

mockTraces.push(...generatedMockTraces);

const mockSpanDetails: Record<string, object> = {
  "2fd9c1ab-f4d0-48b0-a1e3-8c5f2d3b4a6e": {
    timestamp: mockTraces[0]!.timestamp,
    spanId: "2fd9c1ab-f4d0-48b0-a1e3-8c5f2d3b4a6e",
    operationName: "chat",
    model: "gpt-oss-120b",
    responseModel: "gpt-oss-120b-2026-03-01",
    provider: "openai",
    status: "ok",
    durationMs: 842,
    inputTokens: 912,
    outputTokens: 372,
    totalTokens: 1284,
    reasoningTokens: null,
    inputMessages: [
      {
        role: "system",
        parts: [
          {
            type: "text",
            content:
              "You are a helpful travel assistant. You help users find the cheapest flights and best travel options. Use the search_flights tool to look up available flights.",
          },
        ],
      },
      {
        role: "user",
        parts: [
          {
            type: "text",
            content: "Find me the cheapest flight from Kuala Lumpur to Tokyo Narita for March 20th",
          },
        ],
      },
    ],
    outputMessages: [
      {
        role: "assistant",
        parts: [
          {
            type: "tool_call",
            id: "search-flights-1",
            name: "search_flights",
            arguments: {
              from: "KUL",
              to: "NRT",
              date: "2026-03-20",
              sort: "price_asc",
            },
          },
        ],
      },
      {
        role: "tool",
        name: "search_flights",
        parts: [
          {
            type: "tool_call_response",
            id: "search-flights-1",
            response: {
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
            },
          },
        ],
      },
      {
        role: "assistant",
        parts: [
          {
            type: "text",
            content:
              "The cheapest flight from Kuala Lumpur to Tokyo Narita is with AirAsia for $187 on March 20th. It departs at 06:30 and arrives at 14:45 (7h 15m flight). Other options include Malaysia Airlines at $312 and JAL at $445. Would you like me to help you book the AirAsia flight?",
          },
        ],
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
    spanId: "7a2b3c4d-e5f6-7890-abcd-ef1234567890",
    operationName: "chat",
    model: "gpt-4.1",
    responseModel: "gpt-4.1-2026-04-14",
    provider: "openai",
    status: "ok",
    durationMs: 1234,
    inputTokens: 2048,
    outputTokens: 1536,
    totalTokens: 3584,
    reasoningTokens: 512,
    inputMessages: [
      {
        role: "system",
        parts: [{ type: "text", content: "You are a technical documentation assistant." }],
      },
      {
        role: "user",
        parts: [{ type: "text", content: "How do I deploy using the new CI/CD pipeline?" }],
      },
    ],
    outputMessages: [
      {
        role: "assistant",
        parts: [
          {
            type: "reasoning",
            content:
              "The user is asking about deployment with the CI/CD pipeline. I should refer to the deployment docs and provide step-by-step instructions.",
          },
          {
            type: "text",
            content:
              "Based on the documentation, the deployment process involves three steps:\n\n1. **Push to main** - Merge your PR to the main branch\n2. **CI validates** - The pipeline runs tests, linting, and type checks\n3. **Auto-deploy** - SST deploys to staging, then promotes to production after approval\n\nYou can monitor the deployment status in the GitHub Actions tab.",
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
    spanId: "3c4d5e6f-7890-abcd-ef12-345678901234",
    operationName: "chat",
    model: "claude-sonnet-4-20250514",
    responseModel: "claude-sonnet-4-20250514",
    provider: "anthropic",
    status: "error",
    durationMs: 2834,
    inputTokens: 4096,
    outputTokens: 0,
    totalTokens: 4096,
    reasoningTokens: null,
    inputMessages: [
      {
        role: "user",
        parts: [
          {
            type: "text",
            content: "Analyze this dataset and provide recommendations for optimization.",
          },
        ],
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
    spanId: "4d5e6f70-8901-bcde-f123-456789012345",
    operationName: "chat",
    model: "gpt-oss-20b",
    responseModel: "gpt-oss-20b",
    provider: "openai",
    status: "ok",
    durationMs: 456,
    inputTokens: 128,
    outputTokens: 64,
    totalTokens: 192,
    reasoningTokens: null,
    inputMessages: [
      { role: "system", parts: [{ type: "text", content: "You are a friendly assistant." }] },
      { role: "user", parts: [{ type: "text", content: "Hello!" }] },
    ],
    outputMessages: [
      {
        role: "assistant",
        parts: [{ type: "text", content: "Hello! How can I help you today?" }],
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
    spanId: "5e6f7081-9012-cdef-0123-567890123456",
    operationName: "embeddings",
    model: "voyage-3.5",
    responseModel: "voyage-3.5",
    provider: "voyage",
    status: "ok",
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

for (const [index, trace] of generatedMockTraces.entries()) {
  mockSpanDetails[trace.spanId] = {
    timestamp: trace.timestamp,
    spanId: trace.spanId,
    operationName: trace.operationName,
    model: trace.model,
    responseModel: `${trace.model}-2026-03-01`,
    provider: trace.provider,
    status: trace.status,
    durationMs: trace.durationMs,
    inputTokens: 1200 + index * 40,
    outputTokens: trace.status === "error" ? 0 : 480 + index * 20,
    totalTokens: trace.status === "error" ? 1200 + index * 40 : 1680 + index * 60,
    reasoningTokens: index % 2 === 0 ? 220 + index * 10 : null,
    inputMessages: [
      {
        role: "system",
        parts: [
          {
            type: "text",
            content:
              "You are an operations copilot. Explain your recommendation clearly, cite tradeoffs, and preserve enough detail for audit review.",
          },
        ],
      },
      {
        role: "user",
        parts: [
          {
            type: "text",
            content:
              "Compare flight options for next Friday, explain the tradeoffs, and include any operational caveats that might change the recommendation.",
          },
        ],
      },
    ],
    outputMessages: [
      {
        role: "assistant",
        parts: [
          {
            type: "reasoning",
            content:
              "I should compare direct and one-stop options, weigh refund/change restrictions, and make the explanation long enough to exercise the scroll area in the mock UI.",
          },
          { type: "text", content: longFlightNarrative },
          {
            type: "tool_call",
            id: `search-flights-generated-${index + 1}`,
            name: "search_flights",
            arguments: {
              from: "KUL",
              to: "NRT",
              date: "2026-03-20",
              includeNearbyAirports: false,
              sort: "price_asc",
              maxResults: 12,
            },
          },
        ],
      },
      {
        role: "tool",
        name: "search_flights",
        parts: [
          {
            type: "tool_call_response",
            id: `search-flights-generated-${index + 1}`,
            response: longToolPayload,
          },
        ],
      },
      {
        role: "assistant",
        parts:
          trace.status === "error"
            ? []
            : [
                {
                  type: "text",
                  content: `${longFlightNarrative}\n\nRecommended option: AirAsia X remains the best balance of price and schedule, but premium-economy alternatives become more attractive once baggage and change flexibility are priced in.`,
                },
              ],
      },
    ],
    finishReasons: trace.status === "error" ? [] : ["stop"],
    responseId: trace.status === "error" ? "" : `chatcmpl-generated-${index + 1}`,
    metadata: {
      environment: index % 2 === 0 ? "production" : "staging",
      provider: trace.provider,
      scenario: "scroll-demo",
      session_id: `sess_scroll_${index + 1}`,
    },
    spanAttributes: {
      "gen_ai.operation.name": trace.operationName,
      "gen_ai.request.model": trace.model,
      "gen_ai.response.model": `${trace.model}-2026-03-01`,
      "gen_ai.provider.name": trace.provider,
      "gen_ai.usage.input_tokens": 1200 + index * 40,
      "gen_ai.usage.output_tokens": trace.status === "error" ? 0 : 480 + index * 20,
      "gen_ai.usage.total_tokens": trace.status === "error" ? 1200 + index * 40 : 1680 + index * 60,
      "gen_ai.request.metadata.environment": index % 2 === 0 ? "production" : "staging",
      "gen_ai.request.metadata.scenario": "scroll-demo",
      "hebo.agent.slug": "my-agent",
      "hebo.branch.slug": "main",
    },
    resourceAttributes: {
      "service.name": "hebo-gateway",
      "telemetry.sdk.language": "nodejs",
    },
  };
}

export const traceHandlers = [
  // List traces
  http.get<{ agentSlug: string; branchSlug: string }>(
    "/api/v1/agents/:agentSlug/branches/:branchSlug/traces",
    ({ request }) => {
      const url = new URL(request.url);

      // Handle metadata sub-route
      if (url.pathname.endsWith("/metadata")) {
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

      const metadataParam = url.searchParams.get("metadata");
      let metadataFilters: Record<string, string> | null = null;
      try {
        metadataFilters =
          metadataParam === null
            ? {}
            : z.record(z.string(), z.string()).parse(JSON.parse(metadataParam));
      } catch {
        return new HttpResponse(`Invalid metadata filter: ${metadataParam}`, { status: 400 });
      }

      // Apply metadata filters
      let filtered = [...mockTraces];
      for (const [metaKey, value] of Object.entries(metadataFilters)) {
        filtered = filtered.filter((t) => {
          const detail = mockSpanDetails[t.spanId] as any;
          return detail?.metadata?.[metaKey] === value;
        });
      }

      const start = (page - 1) * pageSize;
      const paged = filtered.slice(start, start + pageSize);
      const hasNextPage = start + pageSize < filtered.length;

      return HttpResponse.json({
        data: paged,
        hasNextPage,
      });
    },
  ),

  // Metadata tags
  http.get<{ agentSlug: string; branchSlug: string }>(
    "/api/v1/agents/:agentSlug/branches/:branchSlug/traces/metadata",
    () => {
      return HttpResponse.json({
        tags: {
          session_id: ["sess_abc123", "sess_def456", "sess_ghi789"],
          environment: ["production", "staging"],
          user_id: ["usr_456"],
        },
      });
    },
  ),

  // Get span detail
  http.get<{ agentSlug: string; branchSlug: string; spanId: string }>(
    "/api/v1/agents/:agentSlug/branches/:branchSlug/traces/:spanId",
    ({ params }) => {
      const detail = mockSpanDetails[params.spanId];
      if (!detail) {
        return new HttpResponse("Span not found", { status: 404 });
      }
      return HttpResponse.json(detail);
    },
  ),
];
