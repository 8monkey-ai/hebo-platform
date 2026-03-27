import type { TObject, TSchema, TUnion } from "@sinclair/typebox";

const MASK = "***" as const;

export function redactSensitiveValues<T>(schema: TSchema, value: T): T {
  const obj = value as Record<string, unknown>;

  for (const v of schema.anyOf) {
    const variants = (v as TUnion).anyOf ?? [v];

    for (const variant of variants) {
      const props = (variant as TObject).properties ?? {};

      for (const key in props) {
        if (props[key]?.["x-redact"] && key in obj) {
          obj[key] = MASK;
        }
      }
    }
  }

  return obj as T;
}
