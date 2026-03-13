export function parseNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  return null;
}

export function parseJson(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
}

export function parseJsonArray(value: unknown): unknown[] | null {
  const parsed = parseJson(value);
  if (!Array.isArray(parsed)) return null;
  return parsed?.map((item) => parseJson(item)) ?? null;
}
