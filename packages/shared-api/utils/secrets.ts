import { secrets } from "bun";
import { Resource } from "sst";

export const getSecret = async (name: string): Promise<string | undefined> => {
  try {
    // @ts-expect-error - resource may not be defined
    const value = (Resource[name] as { value: string }).value;
    return value === "undefined" ? undefined : value;
  } catch {
    return (await secrets.get({ service: "hebo", name })) ?? undefined;
  }
};
