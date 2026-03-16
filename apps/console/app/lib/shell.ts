import { proxy } from "valtio";

import type { User } from "~console/lib/auth/types";

export type Models = Record<
  string,
  {
    name: string;
    modality: string;
    providers: readonly string[];
    monthlyFreeTokens: number;
  }
>;

export type Organization = {
  id: string;
  name: string;
  slug: string;
};

export const shellStore = proxy<{
  user: User | undefined;
  models: Models | undefined;
  activeOrg: Organization | undefined;
}>({
  user: undefined,
  models: undefined,
  activeOrg: undefined,
});
