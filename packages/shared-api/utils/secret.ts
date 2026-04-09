import { secrets } from "bun";
import { Resource } from "sst";

const toScreamingSnake = (name: string) =>
  name.replaceAll(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase();

export const getSecret = async (name: string): Promise<string | undefined> => {
  try {
    // @ts-expect-error - resource may not be defined
    const value = (Resource[name] as { value: string }).value;
    if (value !== "undefined") return value;
  } catch {
    const env = process.env[toScreamingSnake(name)];
    if (env) return env;

    const bunSecret = await secrets.get({ service: "hebo", name });
    if (bunSecret) return bunSecret;

    return undefined;
  }
};
