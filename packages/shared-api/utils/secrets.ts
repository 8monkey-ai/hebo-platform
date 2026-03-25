import { secrets } from "bun";
import { Resource } from "sst";

export const getSecret = async (name: string): Promise<string | null> => {
  try {
    // @ts-expect-error: Resource may not be defined
    const value = Resource[name].value;
    return value === "undefined" ? null : value;
  } catch {
    return secrets.get({ service: "hebo", name });
  }
};
