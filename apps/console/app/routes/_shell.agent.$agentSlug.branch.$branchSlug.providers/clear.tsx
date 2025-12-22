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
import { FormControl, FormField } from "@hebo/shared-ui/components/Form";

import { useFormErrorToast } from "~console/lib/errors";


export const CredentialsClearSchema = z.object({
  providerSlug: ((msg) => z.string(msg).trim().min(1, msg))("Select a provider to clear the credentials for"),
});

type CredentialsClearFormValues = z.infer<typeof CredentialsClearSchema>;

type ClearCredentialsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider?: { slug: string; name: string };
};

export function ClearCredentialsDialog({open, onOpenChange, provider}: ClearCredentialsDialogProps) {

  const fetcher = useFetcher();
  const [form, fields] = useForm<CredentialsClearFormValues>({
    id: provider?.slug,
    lastResult: fetcher.data?.submission,
    constraint: getZodConstraint(CredentialsClearSchema),
    defaultValue: {
      providerSlug: provider?.slug,
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
      <DialogContent className="sm:max-w-md">
        <fetcher.Form method="post" {...getFormProps(form)} className="contents">
          <DialogHeader>
            <DialogTitle>Clear {provider?.name} Credentials</DialogTitle>
            <DialogDescription>Are you sure you want to clear the credentials? </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertDescription>
              All gateway requests to {provider?.name} will immediately go back to using the default Hebo built-in provider.
            </AlertDescription>
          </Alert>

          <FormField field={fields.providerSlug} className="hidden">
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
              name="intent"
              value="clear"
              variant="destructive"
              isLoading={fetcher.state !== "idle"}
            >
              Clear
            </Button>
          </DialogFooter>
        </fetcher.Form>
      </DialogContent>
    </Dialog>
  );
}
