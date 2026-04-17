import { useForm } from "@conform-to/react";
import { getZodConstraint } from "@conform-to/zod/v4";
import { useEffect } from "react";
import { useFetcher } from "react-router";
import { z } from "zod";

import { Alert, AlertDescription } from "@hebo/shared-ui/components/Alert";
import { Button } from "@hebo/shared-ui/components/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@hebo/shared-ui/components/Dialog";
import { FormControl, FieldControl, Field } from "@hebo/shared-ui/components/Field";

import { useFormErrorToast } from "~console/lib/errors";

import type { clientAction } from "./route";

export const ApiKeyRevokeSchema = z.object({
  apiKeyId: z.string().trim().min(1),
});

type ApiKeyRevokeFormValues = z.infer<typeof ApiKeyRevokeSchema>;

type RevokeApiKeyDialogProps = {
  apiKey?: { id: string; key: string };
} & React.ComponentProps<typeof Dialog>;

export function RevokeApiKeyDialog({ apiKey, ...props }: RevokeApiKeyDialogProps) {
  const fetcher = useFetcher<typeof clientAction>();
  const [form, fields] = useForm<ApiKeyRevokeFormValues>({
    id: apiKey?.id,
    lastResult: fetcher.state === "idle" ? fetcher.data?.submission : undefined,
    constraint: getZodConstraint(ApiKeyRevokeSchema),
    defaultValue: {
      apiKeyId: apiKey?.id,
    },
  });
  useFormErrorToast(form.allErrors);

  useEffect(() => {
    if (fetcher.state === "idle" && form.status !== "error") {
      props.onOpenChange?.(false, {} as never);
    }
    // oxlint-disable-next-line exhaustive-deps
  }, [fetcher.state, form.status]);

  return (
    <Dialog {...props}>
      <DialogContent>
        <FormControl form={form} as={fetcher.Form}>
          <DialogHeader>
            <DialogTitle>Revoke API key</DialogTitle>
            <DialogDescription>
              Revoking immediately blocks the key from future use.
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertDescription>
              Key ({apiKey?.key ?? ""}) will stop working immediately.
            </AlertDescription>
          </Alert>

          <Field name={fields.apiKeyId.name} className="hidden">
            <FieldControl>
              <input type="hidden" />
            </FieldControl>
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => props.onOpenChange?.(false, {} as never)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              name="intent"
              value="revoke"
              isLoading={fetcher.state !== "idle"}
            >
              Revoke
            </Button>
          </DialogFooter>
        </FormControl>
      </DialogContent>
    </Dialog>
  );
}
