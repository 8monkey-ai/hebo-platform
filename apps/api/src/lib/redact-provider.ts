type RedactableSchema = {
  anyOf?: RedactableSchema[];
  properties?: Record<string, Record<string, unknown>>;
};

const MASK = "***" as const;

export function redactSensitiveValues<T>(schema: RedactableSchema, value: T): T {
  const obj = value as Record<string, unknown>;

  for (const variant of schema.anyOf ?? [schema]) {
    for (const candidate of variant.anyOf ?? [variant]) {
      const props = candidate.properties ?? {};

      for (const key in props) {
        if (props[key]?.["x-redact"] && key in obj) {
          obj[key] = MASK;
        }
      }
    }
  }

  return obj as T;
}
