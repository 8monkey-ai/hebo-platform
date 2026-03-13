export const METADATA_PREFIX = "span_attributes.gen_ai.request.metadata.";

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
  if (!Array.isArray(parsed)) return null;
  return parsed.map((item) => parseJson(item));
}

export function formatStatus(statusCode: string | null): "ok" | "error" | "unknown" {
  if (!statusCode) return "unknown";
  if (statusCode === "STATUS_CODE_OK" || statusCode === "STATUS_CODE_UNSET") return "ok";
  if (statusCode === "STATUS_CODE_ERROR") return "error";
  return "unknown";
}

function truncateSummary(value: string): string {
  return value.length > 200 ? `${value.slice(0, 200)}...` : value;
}

export function extractSummary(message: unknown): string {
  const parsed = parseJson(message);
  if (!parsed) return "";

  if (typeof parsed === "string") return truncateSummary(parsed.trim());
  if (typeof parsed !== "object") return "";

  const { content, parts } = parsed as any;
  const texts: string[] = [];

  if (typeof content === "string") texts.push(content);

  for (const arr of [content, parts]) {
    if (!Array.isArray(arr)) continue;
    for (const part of arr) {
      const value = part?.text ?? part?.content;
      if ((part?.type === "text" || part?.type === "reasoning") && typeof value === "string") {
        texts.push(value);
      }
    }
  }

  return truncateSummary(texts.join("\n").trim());
}
