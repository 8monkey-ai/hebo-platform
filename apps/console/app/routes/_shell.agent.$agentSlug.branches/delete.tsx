import { useEffect } from "react";
import { useFetcher } from "react-router";
import { z } from "zod";

import { getFormProps, useForm } from "@conform-to/react";
import { getZodConstraint } from "@conform-to/zod/v4";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@hebo/shared-ui/components/Dialog";
import { Alert, AlertTitle } from "@hebo/shared-ui/components/Alert";
import { Button } from "@hebo/shared-ui/components/Button";
import { FormControl, FormField, FormLabel, FormMessage } from "@hebo/shared-ui/components/Form";
import { Input } from "@hebo/shared-ui/components/Input";

import { useFormErrorToast } from "~console/lib/errors";


export function createBranchDeleteSchema(branchSlug: string) {
  return z.object({
    slugConfirm: z.literal(branchSlug, "You must type your EXACT branch slug")
  })
}
export type BranchDeleteFormValues = z.infer<ReturnType<typeof createBranchDeleteSchema>>;

type DeleteBranchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchSlug: string;
};

export default function DeleteBranchDialog({ open, onOpenChange, branchSlug }: DeleteBranchDialogProps) {
  
  const fetcher = useFetcher();
  const [form, fields] = useForm<BranchDeleteFormValues>({
    id: branchSlug,
    lastResult: fetcher.data,
    constraint: getZodConstraint(createBranchDeleteSchema(branchSlug)),
  });
  useFormErrorToast(form.allErrors);

  useEffect(() => {
    if (fetcher.state === "idle" && form.status !== "error") {
      onOpenChange(false);
    }
  }, [fetcher.state, form.status]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <fetcher.Form method="post" {...getFormProps(form)} className="contents">
          <DialogHeader>
            <DialogTitle>Delete Branch</DialogTitle>
            <DialogDescription>
              This will delete your branch irreversibly.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <Alert variant="destructive">
              <AlertTitle>
                <strong>Warning:</strong> This action is not reversible. Be certain.
              </AlertTitle>
            </Alert>

            <input type="hidden" name="branchSlug" value={branchSlug} />

            <FormField field={fields.slugConfirm}>
              <FormLabel>
                <div>
                  To confirm, type{" "}
                  <strong>{branchSlug}</strong> in the box below:
                </div>
              </FormLabel>
              <FormControl render={
                <Input autoComplete="off" />
              } />
              <FormMessage />
            </FormField>
          </div>
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
              value="delete"
              isLoading={fetcher.state !== "idle"}
            >
              Delete
            </Button>
          </DialogFooter>
        </fetcher.Form>
      </DialogContent>
    </Dialog>
  );
}
