import { parseWithZod } from "@conform-to/zod/v4";
import { z } from "zod";

import { authService } from "~console/lib/auth";
import { parseError } from "~console/lib/errors";

const inviteSchema = z.object({
  email: z.email("Enter a valid email address"),
  role: z.enum(["member", "admin"]),
});

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
    await authService.removeMember(String(formData.get("email")));
    return null;
  }

  if (intent === "revoke") {
    await authService.cancelInvitation(String(formData.get("invitationId")));
    return null;
  }

  return null;
}
