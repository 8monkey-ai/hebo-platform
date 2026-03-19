import { secrets } from "bun";
import { Resource } from "sst";

export const getSecret = async (name: string) => {
  try {
    // @ts-expect-error: Resource may not be defined
    const value = Resource[name].value;
    return value === "undefined" ? undefined : value;
  } catch {
    return secrets.get({ service: "hebo", name });
  }
};
