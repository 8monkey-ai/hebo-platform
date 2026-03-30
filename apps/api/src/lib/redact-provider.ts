import type { TObject, TSchema, TUnion } from "@sinclair/typebox";

const MASK = "***" as const;

export function redactSensitiveValues<T>(schema: TSchema, value: T): T {
  const obj = value as Record<string, unknown>;

  for (const variant of schema.anyOf ?? [schema]) {
    for (const candidate of (variant as TUnion).anyOf ?? [variant]) {
      const props = (candidate as TObject).properties ?? {};

      for (const key in props) {
        if (props[key]?.["x-redact"] && key in obj) {
          obj[key] = MASK;
        }
      }
    }
  }

  return obj as T;
}
