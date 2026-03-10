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

export const shellStore = proxy<{
  user: User | undefined;
  userId: string | undefined;
  organizationId: string | undefined;
  models: Models | undefined;
}>({
  user: undefined,
  userId: undefined,
  organizationId: undefined,
  models: undefined,
});
