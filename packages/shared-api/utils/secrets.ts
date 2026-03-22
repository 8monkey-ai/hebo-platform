import { secrets } from "bun";
import { Resource } from "sst";

// Convert PascalCase to SCREAMING_SNAKE_CASE: "AuthSecret" → "AUTH_SECRET"
const toEnvKey = (name: string) => name.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase();

export const getSecret = async (name: string) => {
  try {
    // @ts-expect-error: Resource may not be defined
    const value = Resource[name].value;
    return value === "undefined" ? undefined : value;
  } catch {
    try {
      const bunSecret = await secrets.get({ service: "hebo", name });
      if (bunSecret != null) return bunSecret;
    } catch {
      // Bun secrets unavailable (e.g. compiled binary in self-hosted)
    }
    // Fall back to environment variable (self-hosted)
    return process.env[toEnvKey(name)] || undefined;
  }
};
