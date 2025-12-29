import cryptoRandomString from "crypto-random-string";
import slugify from "slugify";

export const createSlug = (
  input: string,
  attachRandomSuffix: boolean = false,
): string => {
  const base = slugify(input, { lower: true, strict: true, trim: true });

  if (!attachRandomSuffix) {
    return base;
  }

  const suffix = cryptoRandomString({
    length: 3,
    // eslint-disable-next-line no-secrets/no-secrets
    characters: "abcdefghijklmnopqrstuvwxyz0123456789",
  });

  return base ? `${base}-${suffix}` : suffix;
};
