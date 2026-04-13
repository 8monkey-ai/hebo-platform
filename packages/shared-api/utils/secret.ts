import { secrets } from "bun";
import { Resource } from "sst";

// SST secrets use PascalCase (e.g. "AuthSecret") which cannot be renamed
// without re-setting values in every deployed stage. Self-hosted env vars
// follow the conventional SCREAMING_SNAKE_CASE (e.g. "AUTH_SECRET").
// This mapping bridges the two conventions at the env-var lookup boundary.
const toEnvVar = (name: string) => name.replaceAll(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase();

export const getSecret = async (name: string): Promise<string | undefined> => {
  // 1. SST Resource — ECS deployments
  try {
    // @ts-expect-error - resource may not be defined
    const value = (Resource[name] as { value: string }).value;
    return value === "undefined" ? undefined : value;
  } catch {}

  // 2. Env var (SCREAMING_SNAKE_CASE) — standalone / self-hosted Docker
  const env = process.env[toEnvVar(name)];
  if (env) return env;

  // 3. Bun secrets — local development
  try {
    return (await secrets.get({ service: "hebo", name })) ?? undefined;
  } catch {}

  return undefined;
};
