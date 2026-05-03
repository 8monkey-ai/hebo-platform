import { parseWithZod } from "@conform-to/zod/v4";
import { redirect } from "react-router";

import { WorkspaceCreateSchema } from "~api/modules/workspaces/types";
import { parseError } from "~console/lib/errors";
import { api } from "~console/lib/service";

import type { Route } from "./+types/route";
import { WorkspaceCreateForm } from "./form";

export async function clientAction({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();

  const submission = parseWithZod(formData, { schema: WorkspaceCreateSchema });

  if (submission.status !== "success") return submission.reply();

  let result;
  try {
    result = await api.workspaces.post({
      name: submission.value.name,
    });
  } catch (error) {
    return submission.reply({ formErrors: [parseError(error).message] });
  }

  if (result.error?.status === 409)
    return submission.reply({
      fieldErrors: { name: [parseError(result.error.value).message] },
    });

  return redirect(`/w/${result.data!.slug}`);
}

export default function WorkspaceCreate() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <WorkspaceCreateForm />
    </div>
  );
}
