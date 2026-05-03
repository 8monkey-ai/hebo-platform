import { redirect } from "react-router";

import { api } from "~console/lib/service";

async function defaultWorkspaceMiddleware() {
  const { data: workspaces } = await api.workspaces.get();

  if (workspaces && workspaces.length > 0) {
    const preferred =
      workspaces.find((w) => w.slug === "default") ?? workspaces[0];
    throw redirect(`/w/${preferred.slug}`);
  }
  throw redirect("/w/create");
}

export const clientMiddleware = [defaultWorkspaceMiddleware];

export default function EmptyRoute() {
  return null;
}
