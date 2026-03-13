export function toGreptimeDatetime(date: Date): string {
  return date.toISOString().replace("T", " ").replace("Z", "");
}

export function parseNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  return null;
}

function normalizeJsonUnicodeEscapes(value: string): string {
  return value.replaceAll(/\\u\{([0-9a-fA-F]+)\}/g, (match, hex) => {
    const codePoint = Number.parseInt(hex, 16);
    return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
  });
}

export function parseJson(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(normalizeJsonUnicodeEscapes(value));
    } catch {
      return value;
    }
  }
}

export function parseJsonArray(value: unknown): unknown[] | null {
  const parsed = parseJson(value);
  return Array.isArray(parsed) ? parsed : null;
}

export function parseJsonArrayItems(value: unknown): unknown[] | null {
  const parsed = parseJsonArray(value);
  return parsed?.map((item) => parseJson(item)) ?? null;
}
