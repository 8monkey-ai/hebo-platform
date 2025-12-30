import { Suspense } from "react";
import { Await } from "react-router";
import { parseWithZod } from "@conform-to/zod/v4";

import { TableSkeleton } from "@hebo/shared-ui/components/Skeleton";

import { authService } from "~console/lib/auth";
import { parseError } from "~console/lib/errors";

import type { Route } from "./+types/route";

import { API_KEY_EXPIRATION_OPTIONS, ApiKeyCreateSchema, CreateApiKeyDialog } from "./create";
import { ApiKeyRevokeSchema } from "./revoke";
import { ApiKeysTable } from "./table";


export async function clientLoader() {
  return { apiKeys: authService.listApiKeys() };
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  switch (intent) {
    case "create": {
      const submission = parseWithZod(formData, {
        schema: ApiKeyCreateSchema,
      });

      if (submission.status !== "success")
          return { submission: submission.reply() };

      let apiKey;
      try {
        apiKey = await authService.generateApiKey(
          submission.value.name,
          API_KEY_EXPIRATION_OPTIONS.find((option) => option.value === submission.value.expiresIn)!.durationMs
        );
      } catch (error) {
        return { submission: submission.reply({
          formErrors: [parseError(error).message],
        })};
      }
      
      return { submission: submission.reply({ resetForm: true }), apiKey };
    }

    case "revoke": {
      const submission = parseWithZod(formData, {
        schema: ApiKeyRevokeSchema,
      });

      if (submission.status !== "success")
        return { submission: submission.reply() };

      try {
        await authService.revokeApiKey(submission.value.apiKeyId);
      } catch (error) {
        return { submission: submission.reply({
          formErrors: [parseError(error).message],
        })};
      }

      return { submission: submission.reply() };
    }
  }
}

export default function ApiKeysRoute({ loaderData }: Route.ComponentProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1>API Keys</h1>
        <p className="text-muted-foreground text-sm">
          Issue and revoke API keys to access your agent programmatically.
        </p>
      </div>

      <Suspense fallback={<TableSkeleton />}>
        <Await resolve={loaderData.apiKeys}>
          {(apiKeys) => <ApiKeysTable apiKeys={apiKeys} />}
        </Await>
      </Suspense>

      <div>
        <CreateApiKeyDialog />
      </div>
    </div>
  );
}
