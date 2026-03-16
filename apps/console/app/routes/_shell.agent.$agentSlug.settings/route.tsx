import { unstable_useRoute as useRoute } from "react-router";

import { authService } from "~console/lib/auth";
import { shellStore } from "~console/lib/shell";

import type { Route } from "./+types/route";
import { DangerSettings } from "./danger-zone";
import { GeneralSettings } from "./general";
import { MembersSettings } from "./members";

export async function clientLoader() {
  const { members, invitations } = await authService.getOrganization();
  const isOwner = members.find((m) => m.userId === shellStore.user?.userId)?.role === "owner";
  return { members, invitations, isOwner };
}

export default function Settings({ loaderData }: Route.ComponentProps) {
  const agent = useRoute("routes/_shell.agent.$agentSlug")!.loaderData!.agent;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1>Agent Settings</h1>
      <GeneralSettings agent={agent} />
      <MembersSettings
        members={loaderData.members}
        invitations={loaderData.invitations}
        isOwner={loaderData.isOwner}
      />
      <DangerSettings agent={agent} />
    </div>
  );
}
