import { useEffect } from "react";
import { useFetcher } from "react-router";
import { z } from "zod";

import { getFormProps, useForm } from "@conform-to/react";
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
import { FormControl, FormField, FormMessage } from "@hebo/shared-ui/components/Form";

import { useFormErrorToast } from "~console/lib/errors";


export const ApiKeyRevokeSchema = z.object({
  apiKeyId: ((msg) => z.string(msg).trim().min(1, msg))("Select an API key to revoke"),
});

type ApiKeyRevokeFormValues = z.infer<typeof ApiKeyRevokeSchema>;

type RevokeApiKeyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiKey?: { id: string; name: string; key: string };
};

export function RevokeApiKeyDialog({open, onOpenChange, apiKey}: RevokeApiKeyDialogProps) {

  const fetcher = useFetcher();
  const [form, fields] = useForm<ApiKeyRevokeFormValues>({
    id: apiKey?.id,
    lastResult: fetcher.data?.submission,
    constraint: getZodConstraint(ApiKeyRevokeSchema),
    defaultValue: {
      apiKeyId: apiKey?.id,
    },
  });
  useFormErrorToast(form.allErrors);

  useEffect(() => {
    if (fetcher.state === "idle" && form.status !== "error") {
      onOpenChange(false);
    }
  }, [fetcher.state, form.status]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-sidebar">
        <fetcher.Form method="post" {...getFormProps(form)} className="contents">
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

          <FormField field={fields.apiKeyId} className="hidden">
            <FormControl>
              <input type="hidden" />
            </FormControl>
          </FormField>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
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
        </fetcher.Form>
      </DialogContent>
    </Dialog>
  );
}
