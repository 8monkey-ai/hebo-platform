import { useSnapshot } from "valtio";

import { shellStore } from "~console/lib/shell";

export function UserName() {
  const { user } = useSnapshot(shellStore);

  return <span>{user?.name}</span>;
}
