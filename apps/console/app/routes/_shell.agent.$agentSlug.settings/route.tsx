import { parseWithZod } from "@conform-to/zod/v4";
import { redirect, unstable_useRoute as useRoute } from "react-router";

import { parseError } from "~console/lib/errors";
import { api } from "~console/lib/service";

import type { Route } from "./+types/route";
import { DangerSettings, createAgentDeleteSchema } from "./danger-zone";
import { GeneralSettings } from "./general";

export async function clientAction({ request, params }: Route.ClientActionArgs) {
  const formData = await request.formData();

  const submission = parseWithZod(formData, {
    schema: createAgentDeleteSchema(params.agentSlug),
  });

  if (submission.status !== "success") return submission.reply();

  let result;
  try {
    result = await api.agents({ agentSlug: params.agentSlug }).delete();
  } catch (error) {
    return submission.reply({ formErrors: [parseError(error).message] });
  }

  if (result.error) return submission.reply({ formErrors: [String(result.error?.value)] });

  return redirect("/");
}

export default function Settings() {
  const agent = useRoute("routes/_shell.agent.$agentSlug")!.loaderData!.agent;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1>Agent Settings</h1>
      <GeneralSettings agent={agent} />
      <DangerSettings agent={agent} />
    </div>
  );
}
