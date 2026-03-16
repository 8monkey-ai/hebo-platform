import { unstable_useRoute as useRoute } from "react-router";

import type { Route } from "./+types/route";
import { DangerSettings } from "./danger-zone";
import { GeneralSettings } from "./general";
import { MembersSettings, membersLoader } from "./members";

export async function clientLoader() {
  return membersLoader();
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
