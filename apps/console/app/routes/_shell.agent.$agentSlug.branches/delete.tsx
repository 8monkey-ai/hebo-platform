import React, { useEffect } from "react";
import { useFetcher } from "react-router";
import { z } from "zod";

import { useForm } from "@conform-to/react";
import { getZodConstraint } from "@conform-to/zod/v4";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@hebo/shared-ui/components/Dialog";
import { Alert, AlertTitle } from "@hebo/shared-ui/components/Alert";
import { Button } from "@hebo/shared-ui/components/Button";
import { FormControl, FieldControl, Field, FieldLabel, FieldError } from "@hebo/shared-ui/components/Field";
import { Input } from "@hebo/shared-ui/components/Input";

import { useFormErrorToast } from "~console/lib/errors";


export function createBranchDeleteSchema(branchSlug: string) {
  return z.object({
    slugConfirm: z.literal(branchSlug, "You must type your EXACT branch slug"),
    branchSlug: z.string()
  })
}
export type BranchDeleteFormValues = z.infer<ReturnType<typeof createBranchDeleteSchema>>;

type DeleteBranchDialogProps = {
  branchSlug: string;
} & React.ComponentProps<typeof Dialog>;

export default function DeleteBranchDialog({ branchSlug, ...props }: DeleteBranchDialogProps) {
  
  const fetcher = useFetcher();
  const [form, fields] = useForm<BranchDeleteFormValues>({
    id: branchSlug,
    lastResult: fetcher.state === "idle" && fetcher.data,
    constraint: getZodConstraint(createBranchDeleteSchema(branchSlug)),
    defaultValue: { branchSlug }
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
        <FormControl
          form={form}
          as={fetcher.Form}
        >
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

            <Field name={fields.branchSlug.name} className="hidden">
              <FieldControl render={
                <input type="hidden" name="branchSlug" />
                } />
            </Field>

            <Field name={fields.slugConfirm.name}>
              <FieldLabel className="block">
                To confirm, type{" "}
                <strong>{branchSlug}</strong> in the box below:
              </FieldLabel>
              <FieldControl render={
                <Input autoComplete="off" />
              } />
              <FieldError />
            </Field>
          </div>
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
              value="delete"
              isLoading={fetcher.state !== "idle"}
            >
              Delete
            </Button>
          </DialogFooter>
        </FormControl>
      </DialogContent>
    </Dialog>
  );
}
