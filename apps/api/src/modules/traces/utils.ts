export function escapeSqlIdentifier(value: string): string {
  return value.replaceAll(`"`, `""`);
}

export function parseNullableNumber(value: unknown): number | null {
  if (typeof value === "string") return Number(value);
  if (typeof value === "number") return value;
  return null;
}

export function parseString(value: unknown): string {
  if (typeof value === "string") return value;
  return "";
}

function normalizeJsonUnicodeEscapes(value: string): string {
  return value.replaceAll(/\\u\{([0-9a-fA-F]+)\}/g, (match, hex: string) => {
    const codePoint = Number.parseInt(hex, 16);
    return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
  });
}

function parseJson(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(normalizeJsonUnicodeEscapes(value));
    } catch {
      return value;
    }
  }
  return value;
}

export function parseJsonArray(value: unknown): unknown[] | null {
  if (!Array.isArray(value)) return [];
  return value.map((item) => parseJson(item));
}

export function formatStatus(httpStatusCode: unknown): "ok" | "error" | "unknown" {
  if (typeof httpStatusCode === "number" || typeof httpStatusCode === "bigint") {
    return httpStatusCode >= 400 ? "error" : "ok";
  }
  return "error";
}

function truncateSummary(value: string): string {
  return value.length > 200 ? `${value.slice(0, 200)}...` : value;
}

export function extractLastUserSummary(messages: unknown): string {
  if (!Array.isArray(messages)) return "";
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = parseJson(messages[i]);
    if (!msg || typeof msg !== "object") continue;
    if ((msg as Record<string, unknown>).role === "user") return extractSummary(msg);
  }
  return "";
}

function extractSummary(message: unknown): string {
  const parsed = parseJson(message);

  if (typeof parsed === "string") return truncateSummary(parsed.trim());
  if (!parsed || typeof parsed !== "object") return "";

  const texts: string[] = [];
  const { content, parts } = parsed as Record<string, unknown>;

  if (typeof content === "string") texts.push(content);

  for (const arr of [content, parts]) {
    if (!Array.isArray(arr)) continue;

    for (const part of arr) {
      if (typeof part !== "object" || part === null) continue;

      const p = part as Record<string, unknown>;
      const value = p.text ?? p.content;

      if ((p.type === "text" || p.type === "reasoning") && typeof value === "string") {
        texts.push(value);
      }
    }
  }

  return truncateSummary(texts.join("\n").trim());
}
