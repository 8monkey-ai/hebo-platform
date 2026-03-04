import { parseWithZod } from "@conform-to/zod/v4";
import { unstable_useRoute as useRoute } from "react-router";

import { parseError } from "~console/lib/errors";
import { api } from "~console/lib/service";

import type { Route } from "./+types/route";
import CreateBranch, { BranchCreateSchema } from "./create";
import { createBranchDeleteSchema } from "./delete";
import BranchesTable from "./table";

export async function clientAction({ request, params }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  let submission, result;

  switch (intent) {
    case "create": {
      submission = parseWithZod(formData, {
        schema: BranchCreateSchema,
      });

      if (submission!.status !== "success") return submission!.reply();

      try {
        result = await api
          .agents({
            agentSlug: params.agentSlug,
          })
          .branches.post({
            name: submission.value.branchName,
            sourceBranchSlug: submission.value.sourceBranchSlug,
          });
      } catch (error) {
        return submission.reply({ formErrors: [parseError(error).message] });
      }

      if (result.error?.status === 409 || result.error?.status === 404)
        return submission.reply({ fieldErrors: { branchName: [String(result.error.value)] } });

      return submission.reply({ resetForm: true });
    }

    case "delete": {
      submission = parseWithZod(formData, {
        schema: createBranchDeleteSchema(formData.get("branchSlug") as string),
      });

      if (submission!.status !== "success") return submission!.reply();

      try {
        result = await api
          .agents({ agentSlug: params.agentSlug })
          .branches({ branchSlug: submission.value.branchSlug })
          .delete();
      } catch (error) {
        return submission.reply({ formErrors: [parseError(error).message] });
      }

      if (result.error)
        return submission.reply({ fieldErrors: { slugConfirm: [String(result.error.value)] } });

      return submission.reply();
    }
  }
}

export default function Branches() {
  const agent = useRoute("routes/_shell.agent.$agentSlug")!.loaderData!.agent!;

  return (
    <>
      <div>
        <h1>Branches</h1>
        <p className="text-sm text-muted-foreground">Manage branches for your agent.</p>
      </div>

      <BranchesTable agent={agent} />

      <CreateBranch branches={agent.branches!} />
    </>
  );
}
