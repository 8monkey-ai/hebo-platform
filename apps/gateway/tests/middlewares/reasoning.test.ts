import { describe, expect, test } from "bun:test";

import {
  Gemini3FlashPreviewAdapter,
  Gemini3ProPreviewAdapter,
} from "~gateway/middlewares/models/gemini";
import type { ModelAdapter } from "~gateway/middlewares/models/model";
import type { ProviderAdapter } from "~gateway/middlewares/providers/provider";
import { VertexProviderAdapter } from "~gateway/middlewares/providers/vertex";

import type { ProviderOptions } from "@ai-sdk/provider-utils";

describe("End-to-End Reasoning Option Transformation", () => {
  type TestCase = {
    name: string;
    modelAdapter: ModelAdapter;
    providerAdapter: ProviderAdapter;
    input: ProviderOptions;
    expected: ProviderOptions;
  };

  const gemini3ProAdapter = new Gemini3ProPreviewAdapter();
  const vertexProvider = new VertexProviderAdapter("gemini-2.5-pro");

  const testCases: TestCase[] = [
    {
      name: "Gemini 3 Pro + Vertex: reasoning enabled (boolean) defaults to high thinkingLevel",
      modelAdapter: gemini3ProAdapter,
      providerAdapter: vertexProvider,
      input: {
        reasoning: {
          enabled: true,
        },
      },
      expected: {
        thinkingConfig: {
          includeThoughts: true,
          thinkingLevel: "high",
        },
      },
    },
    {
      name: "Gemini 3 Pro + Vertex: reasoning with low effort",
      modelAdapter: gemini3ProAdapter,
      providerAdapter: vertexProvider,
      input: {
        reasoning: {
          effort: "low",
        },
      },
      expected: {
        thinkingConfig: {
          includeThoughts: true,
          thinkingLevel: "low",
        },
      },
    },
    {
      name: "Gemini 3 Flash + Vertex: reasoning with medium effort",
      modelAdapter: new Gemini3FlashPreviewAdapter(),
      providerAdapter: vertexProvider,
      input: {
        reasoning: {
          effort: "medium",
        },
      },
      expected: {
        thinkingConfig: {
          includeThoughts: true,
          thinkingLevel: "medium",
        },
      },
    },
  ];

  for (const {
    name,
    modelAdapter,
    providerAdapter,
    input,
    expected,
  } of testCases) {
    test(name, () => {
      const modelTransformed = modelAdapter.transformOptions(input);
      const result = providerAdapter.transformOptions(modelTransformed);
      expect(result).toEqual(expected);
    });
  }
});
