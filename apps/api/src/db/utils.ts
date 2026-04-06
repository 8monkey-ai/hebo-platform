import type { z } from "zod";

const MASK = "***" as const;

type ZodUnionMembers = readonly [z.ZodType, ...z.ZodType[]];

export function redactSensitiveValues<T>(schema: z.ZodUnion<ZodUnionMembers>, value: T): T {
  const obj = value as Record<string, unknown>;

  for (const variant of schema.options) {
    // Handle nested unions (e.g. BedrockProviderConfig = union of two objects)
    if ("options" in variant && Array.isArray((variant as z.ZodUnion<ZodUnionMembers>).options)) {
      for (const inner of (variant as z.ZodUnion<ZodUnionMembers>).options) {
        redactObjectFields(inner, obj);
      }
    } else {
      redactObjectFields(variant, obj);
    }
  }

  return obj as T;
}

function redactObjectFields(schema: z.ZodType, obj: Record<string, unknown>) {
  if (!("shape" in schema)) return;

  const shape = (schema as z.ZodObject).shape as Record<string, z.ZodType>;

  for (const key in shape) {
    if (key in obj && shape[key]?.meta?.()?.redact) {
      obj[key] = MASK;
    }
  }
}
