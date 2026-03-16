import { parseWithZod } from "@conform-to/zod/v4";

import { authService } from "~console/lib/auth";
import { parseError } from "~console/lib/errors";
import { inviteSchema } from "~console/routes/_shell.agent.$agentSlug.settings/invite-schema";

export async function clientAction({ request }: { request: Request }) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "invite") {
    const submission = parseWithZod(formData, { schema: inviteSchema });
    if (submission.status !== "success") return { intent, submission: submission.reply() };
    try {
      await authService.inviteMember(submission.value.email, submission.value.role);
    } catch (error) {
      return { intent, submission: submission.reply({ formErrors: [parseError(error).message] }) };
    }
    return { intent, submission: submission.reply({ resetForm: true }) };
  }

  if (intent === "remove") {
    const email = formData.get("email");
    if (!email || typeof email !== "string") return { error: "Missing email" };
    try {
      await authService.removeMember(email);
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to remove member" };
    }
    return null;
  }

  if (intent === "revoke") {
    const invitationId = formData.get("invitationId");
    if (!invitationId || typeof invitationId !== "string") return { error: "Missing invitation ID" };
    try {
      await authService.cancelInvitation(invitationId);
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to revoke invitation" };
    }
    return null;
  }

  return null;
}
