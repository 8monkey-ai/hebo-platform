import { useSnapshot } from "valtio";

import { shellStore } from "~console/lib/shell";

export function UserName() {
  const { user } = useSnapshot(shellStore);

  // oxlint-disable-next-line prefer-nullish-coalescing
  return <span>{user?.name || user?.email}</span>;
}
