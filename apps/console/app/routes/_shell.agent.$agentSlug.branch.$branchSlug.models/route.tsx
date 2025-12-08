import { unstable_useRoute as useRoute } from "react-router";
import { parseWithZod } from "@conform-to/zod/v4";

import { api } from "~console/lib/service";
import { parseError } from "~console/lib/errors";

import ModelsConfigForm from "./form";
import { modelsConfigFormSchema } from "./schema";

import type { Route } from "./+types/route";

export async function clientLoader() {
  const providers = (await api.providers.get({ query: { configured: true } })).data ?? [];

  return { providers };
}

export async function clientAction({ request, params }: Route.ClientActionArgs) {

  const formData = await request.formData();
  const submission = parseWithZod(formData, {
    schema: modelsConfigFormSchema,
  });

  if (submission.status !== "success") {
    return submission.reply();
  }

  let result;
  try {
    result = await api
      .agents({ agentSlug: params.agentSlug })
      .branches({ branchSlug: params.branchSlug })
      .patch({
        models: submission.value.models ?? [],
      });

  } catch (error) {
    return submission.reply({ formErrors: [parseError(error).message] });
  }

  if (result.error) {
    return submission.reply({ formErrors: [String(result.error?.value)] });
  }

  return submission.reply();
}


export default function ModelsConfigRoute({ loaderData }: Route.ComponentProps) {

  const { agent, branch } = useRoute("routes/_shell.agent.$agentSlug")!.loaderData!;

  return (
      <>
        <div>
          <h1>Model Configuration</h1>
          <p className="text-muted-foreground text-sm">
            Configure access for your agent to different models. Use our managed providers or connect your existing inference endpoints. For latest pricing visit our <a href="https://docs.hebo.ai">Models</a> documentation.
          </p>
        </div>

        <ModelsConfigForm
          agentSlug={agent.slug}
          branchSlug={branch!.slug}
          models={branch!.models}
          providers={loaderData.providers}
        />
      </>
  );
}
