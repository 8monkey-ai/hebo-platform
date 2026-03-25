import type { TSchema, TUnion } from "@sinclair/typebox";

const MASK = "***" as const;

type Redactable = TSchema & { ["x-redact"]?: boolean };

export function redactSensitiveValues<T>(schema: TUnion, value: T): T {
  const clone = structuredClone(value) as Record<string, unknown>;

  for (const v of schema.anyOf) {
    const variants = (v as { anyOf?: TSchema[] }).anyOf ?? [v];

    for (const variant of variants) {
      const props = (variant as { properties?: Record<string, Redactable> }).properties ?? {};

      for (const key in props) {
        if (props[key]?.["x-redact"] && key in clone) {
          clone[key] = MASK;
        }
      }
    }
  }

  return clone as T;
}
