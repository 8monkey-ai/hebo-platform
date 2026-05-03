import { parseWithZod } from "@conform-to/zod/v4";

import { parseError } from "~console/lib/errors";
import { api } from "~console/lib/service";

import type { Route } from "./+types/route";
import PresetsList from "./form";
import { presetCreateFormSchema, presetUpdateFormSchema } from "./schema";

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const presets = (
    await api.workspaces({ workspaceSlug: params.workspaceSlug }).presets.get()
  ).data ?? [];

  return { presets };
}

export async function clientAction({ request, params }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create") {
    const submission = parseWithZod(formData, { schema: presetCreateFormSchema });
    if (submission.status !== "success") return { intent, submission: submission.reply() };

    try {
      const result = await api
        .workspaces({ workspaceSlug: params.workspaceSlug })
        .presets.post({
          name: submission.value.name,
          slug: submission.value.slug,
          model: submission.value.model,
        });
      if (result.error) {
        return {
          intent,
          submission: submission.reply({ formErrors: [parseError(result.error.value).message] }),
        };
      }
    } catch (error) {
      return { intent, submission: submission.reply({ formErrors: [parseError(error).message] }) };
    }

    return { intent, submission: submission.reply({ resetForm: true }) };
  }

  if (intent === "update") {
    const submission = parseWithZod(formData, { schema: presetUpdateFormSchema });
    if (submission.status !== "success") return { intent, submission: submission.reply() };

    try {
      const result = await api
        .workspaces({ workspaceSlug: params.workspaceSlug })
        .presets({ presetSlug: submission.value.slug })
        .patch({
          name: submission.value.name,
          model: submission.value.model,
        });
      if (result.error) {
        return {
          intent,
          submission: submission.reply({ formErrors: [parseError(result.error.value).message] }),
        };
      }
    } catch (error) {
      return { intent, submission: submission.reply({ formErrors: [parseError(error).message] }) };
    }

    return { intent, submission: submission.reply() };
  }

  if (intent === "delete") {
    const presetSlug = formData.get("slug");
    if (!presetSlug || typeof presetSlug !== "string") return;
    try {
      await api
        .workspaces({ workspaceSlug: params.workspaceSlug })
        .presets({ presetSlug })
        .delete();
    } catch (error) {
      return { intent, error: parseError(error).message };
    }
    return { intent };
  }
}

export default function PresetsRoute({ loaderData }: Route.ComponentProps) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1>Presets</h1>
        <p className="text-sm text-muted-foreground">
          Define named model presets for this workspace. Use the preset slug in place of a canonical
          model id when calling the gateway.
        </p>
      </div>

      <PresetsList presets={loaderData.presets} />
    </div>
  );
}
