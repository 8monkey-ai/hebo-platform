import { parseWithZod } from "@conform-to/zod/v4";
import { redirect } from "react-router";

import { parseError } from "~console/lib/errors";
import { api } from "~console/lib/service";

import { createAgentDeleteSchema } from "../_shell.agent.$agentSlug.settings/danger-zone";

export async function clientAction({
  request,
  params,
}: {
  request: Request;
  params: { agentSlug: string };
}) {
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
