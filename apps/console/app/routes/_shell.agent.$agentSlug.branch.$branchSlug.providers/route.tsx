import { parseWithZod } from "@conform-to/zod/v4";

import { parseError } from "~console/lib/errors";
import { api } from "~console/lib/service";

import type { Route } from "./+types/route";
import { CredentialsClearSchema } from "./clear";
import { ProviderConfigureSchema } from "./configure";
import { ProvidersList } from "./list";

export async function clientLoader() {
  return { providers: (await api.providers.get()).data ?? [] };
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  switch (intent) {
    case "configure": {
      const submission = parseWithZod(formData, {
        schema: ProviderConfigureSchema,
      });

      if (submission.status !== "success") return { submission: submission.reply() };

      let provider;
      try {
        provider = await api.providers({ slug: submission.value.slug }).config.put({
          ...submission.value.config,
        });
      } catch (error) {
        return {
          submission: submission.reply({
            formErrors: [parseError(error).message],
          }),
        };
      }

      return { submission: submission.reply(), provider };
    }

    case "clear": {
      const submission = parseWithZod(formData, {
        schema: CredentialsClearSchema,
      });

      if (submission.status !== "success") return { submission: submission.reply() };

      try {
        await api.providers({ slug: submission.value.providerSlug }).config.delete();
      } catch (error) {
        return {
          submission: submission.reply({
            formErrors: [parseError(error).message],
          }),
        };
      }

      return { submission: submission.reply() };
    }
  }
}

export default function ProviderRoute({ loaderData }: Route.ComponentProps) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1>Providers</h1>
        <p className="text-sm text-muted-foreground">
          Use your own provider API keys to access Hebo Gateway.
        </p>
      </div>

      <ProvidersList providers={loaderData.providers} />
    </div>
  );
}
