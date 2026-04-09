import { secrets } from "bun";
import { Resource } from "sst";

const toScreamingSnake = (name: string) =>
  name.replaceAll(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase();

export const getSecret = async (name: string): Promise<string | undefined> => {
  // SST resource for ECS deployments
  try {
    // @ts-expect-error - resource may not be defined
    const value = (Resource[name] as { value: string }).value;
    return value === "undefined" ? undefined : value;
  } catch {}

  // Env variables for standalone
  const env = process.env[toScreamingSnake(name)];
  if (env) return env;

  // Bun secrets for local development
  try {
    return (await secrets.get({ service: "hebo", name })) ?? undefined;
  } catch {
    return undefined;
  }
};
