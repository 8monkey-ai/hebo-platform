import { proxy } from "valtio";

import type { User } from "~console/lib/auth/types";

export type Models = Record<
  string,
  {
    name: string;
    modality: string;
    providers: readonly string[];
    free: boolean;
  }
>;

export const shellStore = proxy<{
  user: User | undefined;
  models: Models | undefined;
}>({
  user: undefined,
  models: undefined,
});
