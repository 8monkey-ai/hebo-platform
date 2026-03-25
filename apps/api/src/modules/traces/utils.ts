export function escapeSqlIdentifier(value: string): string {
  return value.replaceAll(`"`, `""`);
}

// Workaround for GreptimeDB cluster-mode bug where binary-encoded parameters
// in the Postgres extended query protocol hang indefinitely.
// See: https://github.com/GreptimeTeam/greptimedb/issues/7819
export function escapeSqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

export function toTimestampLiteral(value: Date): string {
  return `'${value.toISOString()}'`;
}

export function parseNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function parseString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === null || value === undefined || value === "") return "";
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
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(normalizeJsonUnicodeEscapes(value));
    } catch {
      return value;
    }
  }
}

// FUTURE: remove once this is fixed https://github.com/GreptimeTeam/greptimedb/issues/7808
export function parseJsonArray(value: unknown): unknown[] | null {
  const parsed = parseJson(value);
  if (!Array.isArray(parsed)) return null;
  return parsed.map((item) => parseJson(item));
}

export function formatStatus(statusCode: unknown): "ok" | "error" | "unknown" {
  if (!statusCode) return "unknown";
  if (statusCode === "STATUS_CODE_OK" || statusCode === "STATUS_CODE_UNSET") return "ok";
  if (statusCode === "STATUS_CODE_ERROR") return "error";
  return "unknown";
}

function truncateSummary(value: string): string {
  return value.length > 200 ? `${value.slice(0, 200)}...` : value;
}

export function extractLastUserSummary(messages: unknown): string {
  const parsed = parseJsonArray(messages);
  if (!parsed) return "";
  for (let i = parsed.length - 1; i >= 0; i--) {
    const msg = parsed[i];
    if (!msg || typeof msg !== "object") continue;
    if ((msg as Record<string, unknown>).role === "user") return extractSummary(msg);
  }
  return "";
}

function extractSummary(message: unknown): string {
  const parsed = parseJson(message);

  if (typeof parsed === "string") return truncateSummary(parsed.trim());
  if (!parsed || typeof parsed !== "object") return "";

  const record = parsed as Record<string, unknown>;

  const texts: string[] = [];
  if (typeof record.content === "string") texts.push(record.content);

  for (const arr of [record.content, record.parts]) {
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
