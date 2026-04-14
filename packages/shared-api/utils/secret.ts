import { secrets } from "bun";
import { Resource } from "sst";

export const getSecret = async (name: string): Promise<string | undefined> => {
  // 1. SST Resource — ECS deployments
  try {
    // @ts-expect-error - resource may not be defined
    const v = (Resource[name] as { value: string }).value;
    if (v && v !== "undefined") return v;
  } catch {}

  // 2. Bun secrets — local development
  try {
    return (await secrets.get({ service: "hebo", name })) ?? undefined;
  } catch {}

  // 3. Env var — standalone / self-hosted Docker
  return process.env[name];
};
