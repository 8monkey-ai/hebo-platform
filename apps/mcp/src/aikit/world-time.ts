import { z } from "zod";

const IANA_ZONES = Intl.supportedValuesOf("timeZone");

const resolve = (query: string): string | undefined => {
  const q = query.toLowerCase().replaceAll(/\s+/g, "_");
  // Exact match (case-insensitive)
  const exact = IANA_ZONES.find((tz) => tz.toLowerCase() === q);
  if (exact) return exact;
  // Partial match (e.g., "tokyo" → "Asia/Tokyo")
  return IANA_ZONES.find((tz) => tz.toLowerCase().includes(q));
};

export const worldTimeTool = {
  name: "world_time",
  config: {
    description:
      "Get time for one or more locations. Supports IANA timezones (e.g., 'America/New_York') or partial city names (e.g., 'tokyo' → 'Asia/Tokyo'). Use 'at' to query a specific point in time.",
    inputSchema: {
      timezones: z
        .array(z.string())
        .min(1)
        .describe(
          "IANA timezones or partial city names (e.g., 'America/New_York', 'tokyo', 'london')",
        ),
      at: z
        .union([z.literal("now"), z.string(), z.number()])
        .optional()
        .describe(
          "Point in time to query. 'now' (default), ISO 8601 string (e.g., '2026-02-15T14:00:00Z'), or Unix timestamp in milliseconds.",
        ),
      options: z
        .object({
          locale: z
            .string()
            .optional()
            .describe("Locale for formatting (e.g., 'en-US')"),
          timeStyle: z.enum(["short", "medium", "long", "full"]).optional(),
          dateStyle: z.enum(["short", "medium", "long", "full"]).optional(),
        })
        .optional(),
    },
  },
  handler: async (input: {
    timezones: string[];
    at?: "now" | string | number;
    options?: {
      locale?: string;
      timeStyle?: "short" | "medium" | "long" | "full";
      dateStyle?: "short" | "medium" | "long" | "full";
    };
  }) => {
    const timestamp =
      !input.at || input.at === "now" ? new Date() : new Date(input.at);

    if (Number.isNaN(timestamp.getTime())) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ error: `Invalid 'at' value: ${input.at}` }),
          },
        ],
      };
    }

    const {
      locale = "en-US",
      timeStyle = "short",
      dateStyle = "medium",
    } = input.options || {};
    const fmt = (tz: string, opts: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(locale, { timeZone: tz, ...opts });

    const results = input.timezones.map((tz) => {
      const iana = resolve(tz);
      if (!iana) return { input: tz, error: "Unknown timezone" };

      const parts = fmt(iana, { timeZoneName: "short" }).formatToParts(
        timestamp,
      );
      const local = new Date(
        timestamp.toLocaleString("en-US", { timeZone: iana }),
      );
      const offsetMin = Math.round(
        (local.getTime() -
          new Date(
            timestamp.toLocaleString("en-US", { timeZone: "UTC" }),
          ).getTime()) /
          60_000,
      );
      const day = local.getDay();

      return {
        input: tz,
        iana,
        iso: timestamp.toISOString(),
        unixMs: timestamp.getTime(),
        offsetMinutes: offsetMin,
        abbrev: parts.find((p) => p.type === "timeZoneName")?.value || "",
        date: fmt(iana, { dateStyle }).format(timestamp),
        time: fmt(iana, { timeStyle }).format(timestamp),
        weekday: fmt(iana, { weekday: "long" }).format(timestamp),
        isWeekend: day === 0 || day === 6,
      };
    });

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ results }, undefined, 2),
        },
      ],
    };
  },
};
