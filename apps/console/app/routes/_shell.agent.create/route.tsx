import { parseWithZod } from "@conform-to/zod/v4";
import { redirect } from "react-router";

import { parseError } from "~console/lib/errors";
import { api } from "~console/lib/service";

import type { Route } from "./+types/route";
import { AgentCreateForm, AgentCreateSchema } from "./form";

export async function clientAction({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();

  const submission = parseWithZod(formData, { schema: AgentCreateSchema });

  if (submission.status !== "success") return submission.reply();

  let result;
  try {
    result = await api.agents.post({
      name: submission.value.agentName,
      defaultModel: submission.value.defaultModel,
    });
  } catch (error) {
    return submission.reply({ formErrors: [parseError(error).message] });
  }

  if (result.error?.status === 409)
    return submission.reply({ fieldErrors: { agentName: [String(result.error.value)] } });

  return redirect(`/agent/${result.data!.slug}/branch/${result.data!.branches![0].slug}`);
}

export default function AgentCreate() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <AgentCreateForm />
    </div>
  );
}
