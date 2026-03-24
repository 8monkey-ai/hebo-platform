import { Resource } from "sst";

export const getSecret = async (name: string) => {
  try {
    // @ts-expect-error: Resource may not be defined
    const value = Resource[name].value;
    return value === "undefined" ? undefined : value;
  } catch {
    // Env var fallback (self-hosted): PascalCase → SCREAMING_SNAKE_CASE
    const envValue = process.env[name.replaceAll(/([a-z])([A-Z])/g, "$1_$2").toUpperCase()];
    if (envValue) return envValue;

    // Bun secrets fallback (local dev)
    try {
      const { secrets } = await import("bun");
      return await secrets.get({ service: "hebo", name });
    } catch {
      return;
    }
  }
};
