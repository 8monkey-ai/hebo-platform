import { useEffect } from "react";
import { useFetcher } from "react-router";
import { z } from "zod";

import { FormProvider, getFormProps, useForm } from "@conform-to/react";
import { getZodConstraint } from "@conform-to/zod/v4";

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
import { FieldControl, Field } from "@hebo/shared-ui/components/Field";

import { useFormErrorToast } from "~console/lib/errors";


export const ApiKeyRevokeSchema = z.object({
  apiKeyId: ((msg) => z.string(msg).trim().min(1, msg))("Select an API key to revoke"),
});

type ApiKeyRevokeFormValues = z.infer<typeof ApiKeyRevokeSchema>;

type RevokeApiKeyDialogProps = {
  apiKey?: { id: string; description: string; value: string };
} & React.ComponentProps<typeof Dialog>;

export function RevokeApiKeyDialog({apiKey, ...props}: RevokeApiKeyDialogProps) {

  const fetcher = useFetcher();
  const [form, fields] = useForm<ApiKeyRevokeFormValues>({
    id: apiKey?.id,
    lastResult: fetcher.state === "idle" && fetcher.data,
    constraint: getZodConstraint(ApiKeyRevokeSchema),
    defaultValue: {
      apiKeyId: apiKey?.id,
    },
  });
  useFormErrorToast(form.allErrors);

  useEffect(() => {
    if (fetcher.state === "idle" && form.status !== "error") {
      props.onOpenChange(false);
    }
  }, [fetcher.state, form.status]);

  return (
    <Dialog {...props}>
      <DialogContent>
        <fetcher.Form method="post" {...getFormProps(form)} className="contents">
        <FormProvider context={form.context}>
          <DialogHeader>
            <DialogTitle>Revoke API key</DialogTitle>
            <DialogDescription>
              Revoking immediately blocks the key from future use.
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertDescription>
              Key ({apiKey?.value ?? ""}) will stop working immediately.
            </AlertDescription>
          </Alert>

          <Field name={fields.apiKeyId.name} className="hidden">
            <FieldControl render={
              <input type="hidden" />
              } />
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => props.onOpenChange(false)}
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
        </FormProvider>
        </fetcher.Form>
      </DialogContent>
    </Dialog>
  );
}
