import { unstable_useRoute as useRoute } from "react-router";

import { authService } from "~console/lib/auth";
import { shellStore } from "~console/lib/shell";

import type { Route } from "./+types/route";
import { DangerSettings } from "./danger-zone";
import { GeneralSettings } from "./general";
import { MembersSettings } from "./members";

export async function clientLoader() {
  const { members, invitations } = await authService.getOrganization();
  const currentRole = members.find((m) => m.userId === shellStore.user?.userId)?.role;
  const isOwner = currentRole === "owner";
  const canManage = isOwner || currentRole === "admin";
  return { members, invitations, isOwner, canManage };
}

export default function Settings({ loaderData }: Route.ComponentProps) {
  const workspace = useRoute("routes/_shell.w.$workspaceSlug")!.loaderData!.workspace;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1>Workspace Settings</h1>
      <GeneralSettings workspace={workspace} />
      <MembersSettings
        members={loaderData.members}
        invitations={loaderData.invitations.filter((i) => i.teamId === workspace.team_id)}
        isOwner={loaderData.isOwner}
        canManage={loaderData.canManage}
        workspace={workspace}
      />
      <DangerSettings workspace={workspace} />
    </div>
  );
}
