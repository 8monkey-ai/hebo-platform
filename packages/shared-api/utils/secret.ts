import { secrets } from "bun";
import { Resource } from "sst";

export const getSecret = async (name: string): Promise<string | undefined> => {
  // 1. SST Resource — ECS deployments
  try {
    // @ts-expect-error - resource may not be defined
    const value = (Resource[name] as { value: string }).value;
    return value === "undefined" ? undefined : value;
  } catch {}

  // 2. Env var — standalone / self-hosted Docker
  const env = process.env[name];
  if (env) return env;

  // 3. Bun secrets — local development
  try {
    return (await secrets.get({ service: "hebo", name })) ?? undefined;
  } catch {}

  return undefined;
};
