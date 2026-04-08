import { secrets } from "bun";
import { Resource } from "sst";

/** Convert PascalCase to SCREAMING_SNAKE_CASE (e.g. `AuthSecret` → `AUTH_SECRET`). */
const toEnvName = (name: string) => name.replaceAll(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase();

export const getSecret = async (name: string): Promise<string | undefined> => {
  try {
    // @ts-expect-error - resource may not be defined
    const value = (Resource[name] as { value: string }).value;
    return value === "undefined" ? undefined : value;
  } catch {
    const bunSecret = await secrets.get({ service: "hebo", name });
    if (bunSecret) return bunSecret;
    return process.env[toEnvName(name)] ?? undefined;
  }
};
