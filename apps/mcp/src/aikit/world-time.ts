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
      "Get current time for one or more locations. Supports IANA timezones (e.g., 'America/New_York') or partial city names (e.g., 'tokyo' → 'Asia/Tokyo').",
    inputSchema: {
      timezones: z
        .array(z.string())
        .min(1)
        .describe(
          "IANA timezones or partial city names (e.g., 'America/New_York', 'tokyo', 'london')",
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
    options?: {
      locale?: string;
      timeStyle?: "short" | "medium" | "long" | "full";
      dateStyle?: "short" | "medium" | "long" | "full";
    };
  }) => {
    const now = new Date();
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

      const parts = fmt(iana, { timeZoneName: "short" }).formatToParts(now);
      const local = new Date(now.toLocaleString("en-US", { timeZone: iana }));
      const offsetMin = Math.round(
        (local.getTime() -
          new Date(
            now.toLocaleString("en-US", { timeZone: "UTC" }),
          ).getTime()) /
          60_000,
      );
      const day = local.getDay();

      return {
        input: tz,
        iana,
        iso: now.toISOString(),
        unixMs: now.getTime(),
        offsetMinutes: offsetMin,
        abbrev: parts.find((p) => p.type === "timeZoneName")?.value || "",
        date: fmt(iana, { dateStyle }).format(now),
        time: fmt(iana, { timeStyle }).format(now),
        weekday: fmt(iana, { weekday: "long" }).format(now),
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
