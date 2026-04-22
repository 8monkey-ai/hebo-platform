import { proxy } from "valtio";

import type { Organization, User } from "~console/lib/auth/types";

export type Models = Record<
  string,
  {
    name: string;
    lab: string;
    modality: string;
    providers: readonly string[];
    free: boolean;
    requiresByok: boolean;
  }
>;

export const shellStore = proxy<{
  user: User | undefined;
  organizations: Organization[];
  models: Models | undefined;
}>({
  user: undefined,
  organizations: [],
  models: undefined,
});
