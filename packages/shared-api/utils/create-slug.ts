import slugify from "@sindresorhus/slugify";
import cryptoRandomString from "crypto-random-string";

export const slugFromString = (input: string, suffixLength = 0): string => {
  const base = slugify(input);

  if (!suffixLength) return base;

  const suffix = cryptoRandomString({
    length: suffixLength,
    // eslint-disable-next-line no-secrets/no-secrets
    characters: "abcdefghijklmnopqrstuvwxyz0123456789",
  });

  return base ? `${base}-${suffix}` : suffix;
};

export const slugFromName = (name: string | null, email: string): string => {
  if (!name) return slugFromString(email.split("@")[0].slice(0, 6), 6);

  const normalized = slugify(name, { separator: " " });
  const parts = normalized.trim().split(/\s+/);
  const base =
    parts.length > 1
      ? parts[0].slice(0, 3) + parts.at(-1)!.slice(0, 3)
      : normalized.slice(0, 6);

  return slugFromString(base, 6);
};
