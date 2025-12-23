import { describe, expect, test } from "bun:test";

import { ClaudeOpus45Adapter } from "~gateway/middlewares/models/claude";
import {
  Gemini3FlashPreviewAdapter,
  Gemini3ProPreviewAdapter,
} from "~gateway/middlewares/models/gemini";
import type { ModelAdapter } from "~gateway/middlewares/models/model";
import { BedrockProviderAdapter } from "~gateway/middlewares/providers/bedrock";
import type { ProviderAdapter } from "~gateway/middlewares/providers/provider";
import { VertexProviderAdapter } from "~gateway/middlewares/providers/vertex";

import type { ProviderOptions } from "@ai-sdk/provider-utils";

describe("End-to-End Reasoning Option Transformation", () => {
  type TestCase = {
    name: string;
    modelAdapter: ModelAdapter;
    providerAdapter: ProviderAdapter;
    initialInput: ProviderOptions | undefined;
    expectedOutput: ProviderOptions | Record<string, any>;
  };

  const gemini3ProAdapter = new Gemini3ProPreviewAdapter();
  const vertexProvider = new VertexProviderAdapter("gemini-2.5-pro");
  const claudeAdapter = new ClaudeOpus45Adapter();
  const bedrockProvider = new BedrockProviderAdapter(
    "anthropic.claude-3-sonnet-20240229-v1:0",
  );

  const testCases: TestCase[] = [
    {
      name: "Gemini 3 Pro + Vertex: reasoning enabled (boolean) defaults to high thinkingLevel",
      modelAdapter: gemini3ProAdapter,
      providerAdapter: vertexProvider,
      initialInput: {
        openaiCompatible: {
          reasoning: {
            enabled: true,
          },
        },
      },
      expectedOutput: {
        openaiCompatible: {
          reasoning: {
            enabled: true,
          },
        },
        google: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingLevel: "high",
          },
        },
      },
    },
    {
      name: "Gemini 3 Pro + Vertex: reasoning with low effort",
      modelAdapter: gemini3ProAdapter,
      providerAdapter: vertexProvider,
      initialInput: {
        openaiCompatible: {
          reasoning: {
            effort: "low",
          },
        },
      },
      expectedOutput: {
        openaiCompatible: {
          reasoning: {
            effort: "low",
          },
        },
        google: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingLevel: "low",
          },
        },
      },
    },
    {
      name: "Claude Opus + Bedrock: reasoning enabled (boolean) defaults to medium budget",
      modelAdapter: claudeAdapter,
      providerAdapter: bedrockProvider,
      initialInput: {
        openaiCompatible: {
          reasoning: {
            enabled: true,
          },
        },
      },
      expectedOutput: {
        openaiCompatible: {
          reasoning: {
            enabled: true,
          },
        },
        bedrock: {
          additionalModelRequestFields: {
            thinking: {
              type: "enabled",
              budget_tokens: 32_000,
            },
          },
        },
      },
    },
    {
      name: "Claude Opus + Bedrock: reasoning with minimal effort",
      modelAdapter: claudeAdapter,
      providerAdapter: bedrockProvider,
      initialInput: {
        openaiCompatible: {
          reasoning: {
            effort: "minimal",
          },
        },
      },
      expectedOutput: {
        openaiCompatible: {
          reasoning: {
            effort: "minimal",
          },
        },
        bedrock: {
          additionalModelRequestFields: {
            thinking: {
              type: "enabled",
              budget_tokens: 6400,
            },
          },
        },
      },
    },
    {
      name: "Gemini 3 Flash + Vertex: reasoning with medium effort",
      modelAdapter: new Gemini3FlashPreviewAdapter(),
      providerAdapter: vertexProvider,
      initialInput: {
        openaiCompatible: {
          reasoning: {
            effort: "medium",
          },
        },
      },
      expectedOutput: {
        openaiCompatible: {
          reasoning: {
            effort: "medium",
          },
        },
        google: {
          thinkingConfig: {
            includeThoughts: true,
            thinkingLevel: "medium",
          },
        },
      },
    },
  ];

  for (const {
    name,
    modelAdapter,
    providerAdapter,
    initialInput,
    expectedOutput,
  } of testCases) {
    test(name, () => {
      const modelTransformed = modelAdapter.transformOptions(initialInput);
      const result = providerAdapter.transformOptions(modelTransformed);
      expect(result).toEqual(expectedOutput);
    });
  }
});
