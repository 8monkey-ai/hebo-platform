import { parseWithZod } from "@conform-to/zod/v4";
import { redirect } from "react-router";

import { parseError } from "~console/lib/errors";
import { api } from "~console/lib/service";

import { createWorkspaceDeleteSchema } from "../_shell.w.$workspaceSlug.settings/danger-zone";

export async function clientAction({
  request,
  params,
}: {
  request: Request;
  params: { workspaceSlug: string };
}) {
  const formData = await request.formData();
  const submission = parseWithZod(formData, {
    schema: createWorkspaceDeleteSchema(params.workspaceSlug),
  });

  if (submission.status !== "success") return submission.reply();

  let result;
  try {
    result = await api.workspaces({ workspaceSlug: params.workspaceSlug }).delete();
  } catch (error) {
    return submission.reply({ formErrors: [parseError(error).message] });
  }

  if (result.error)
    return submission.reply({ formErrors: [parseError(result.error.value).message] });

  return redirect("/");
}
