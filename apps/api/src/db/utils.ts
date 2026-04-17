import type { z } from "zod";

const MASK = "***" as const;

export function redactSensitiveValues<T>(
  schema: { options: readonly z.core.$ZodType[] },
  value: T,
): T {
  const obj = value as Record<string, unknown>;

  for (const variant of schema.options) {
    if (!("shape" in variant)) continue;

    const shape = (variant as z.ZodObject).shape as Record<string, z.ZodType>;

    for (const key in shape) {
      if (key in obj && shape[key]?.meta?.()?.redact) {
        obj[key] = MASK;
      }
    }
  }

  return obj as T;
}
