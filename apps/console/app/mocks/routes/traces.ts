import { http, HttpResponse } from "msw";

const sampleModels = ["gpt-oss-20b", "gpt-oss-120b", "claude-opus-4-6", "gemini-2.5-pro"];
const sampleOperations = ["gen_ai.chat", "gen_ai.embeddings", "gen_ai.chat.completions"];
const sampleProviders = ["groq", "bedrock", "vertex"];
const sampleFinishReasons = ["stop", "length", "tool_calls"];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateTraceId(): string {
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

function generateSpanId(): string {
  return Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

function generateMockTraces(count: number, agentSlug: string, branchSlug: string) {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const startTime = new Date(now - (i + 1) * randomBetween(30_000, 600_000));
    const durationMs = randomBetween(200, 5000);
    const endTime = new Date(startTime.getTime() + durationMs);
    const model = randomItem(sampleModels);
    const operation = randomItem(sampleOperations);
    const provider = randomItem(sampleProviders);
    const traceId = generateTraceId();
    const spanId = generateSpanId();
    const inputTokens = randomBetween(100, 5000);
    const outputTokens = randomBetween(50, 2000);
    const hasToolCalls = Math.random() > 0.6;
    const finishReason = hasToolCalls ? "tool_calls" : randomItem(sampleFinishReasons);

    return {
      traceId,
      spanId,
      operationName: operation,
      model,
      status: Math.random() > 0.1 ? "OK" : "ERROR",
      durationMs,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      provider,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      finishReason,
      agentSlug,
      branchSlug,
      inputMessages: [
        { role: "system", content: "You are a helpful AI assistant." },
        {
          role: "user",
          content: `This is a sample user message for trace ${i + 1}. It demonstrates how input messages are displayed in the trace detail view. The content can be quite long in practice, spanning multiple paragraphs with detailed instructions for the model.`,
        },
      ],
      outputContent: hasToolCalls
        ? undefined
        : `This is a sample response for trace ${i + 1}. The model generated this completion based on the input messages. In a real scenario, this could be a detailed answer, code snippet, or any other type of generated content.`,
      tools: hasToolCalls
        ? [
            {
              function: {
                name: "get_weather",
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
            {
              function: {
                name: "search_docs",
                parameters: {
                  type: "object",
                  properties: {
                    query: { type: "string" },
                    limit: { type: "number" },
                  },
                  required: ["query"],
                },
              },
            },
          ]
        : undefined,
      toolCalls: hasToolCalls
        ? [
            {
              function: {
                name: "get_weather",
                arguments: JSON.stringify({
                  location: "San Francisco, CA",
                  unit: "celsius",
                }),
              },
              result: JSON.stringify({ temp: 18, condition: "foggy", humidity: 78 }),
            },
          ]
        : undefined,
      requestMetadata:
        Math.random() > 0.5
          ? {
              session_id: `sess_${generateSpanId().slice(0, 8)}`,
              environment: randomItem(["staging", "production", "development"]),
              user_id: `usr_${randomBetween(1000, 9999)}`,
            }
          : {},
      rawAttributes: {
        "gen_ai.system": provider,
        "gen_ai.request.model": model,
        "gen_ai.usage.input_tokens": inputTokens,
        "gen_ai.usage.output_tokens": outputTokens,
        "gen_ai.response.finish_reasons": finishReason,
        "hebo.agent.slug": agentSlug,
        "hebo.branch.slug": branchSlug,
      },
    };
  });
}

export const traceHandlers = [
  http.get<{ agentSlug: string; branchSlug: string }>(
    "/api/v1/agents/:agentSlug/branches/:branchSlug/traces",
    ({ params, request }) => {
      const url = new URL(request.url);
      const page = Number(url.searchParams.get("page") ?? "1");
      const pageSize = Number(url.searchParams.get("pageSize") ?? "50");

      const allTraces = generateMockTraces(73, params.agentSlug, params.branchSlug);

      // Apply metadata filters
      let filtered = allTraces;
      for (const [key, value] of url.searchParams.entries()) {
        if (key.startsWith("meta.")) {
          const metaKey = key.slice(5);
          filtered = filtered.filter((t) => t.requestMetadata?.[metaKey] === value);
        }
      }

      const start = (page - 1) * pageSize;
      const paged = filtered.slice(start, start + pageSize);

      return HttpResponse.json({
        data: paged.map(({ traceId, spanId, operationName, model, status, durationMs, startTime }) => ({
          traceId,
          spanId,
          operationName,
          model,
          status,
          durationMs,
          startTime,
        })),
        total: filtered.length,
        page,
        pageSize,
      });
    },
  ),

  http.get<{ agentSlug: string; branchSlug: string; traceId: string }>(
    "/api/v1/agents/:agentSlug/branches/:branchSlug/traces/:traceId",
    ({ params }) => {
      const traces = generateMockTraces(1, params.agentSlug, params.branchSlug);
      const trace = { ...traces[0]!, traceId: params.traceId };
      return HttpResponse.json(trace);
    },
  ),

  http.get<{ agentSlug: string; branchSlug: string }>(
    "/api/v1/agents/:agentSlug/branches/:branchSlug/traces/metadata-keys",
    () => {
      return HttpResponse.json(["session_id", "environment", "user_id", "experiment"]);
    },
  ),
];
