import { GitBranch } from "lucide-react";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { z } from "zod";

import { useForm } from "@conform-to/react";
import { getZodConstraint } from "@conform-to/zod/v4";

import { Button } from "@hebo/shared-ui/components/Button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@hebo/shared-ui/components/Dialog";
import { FormControl, FieldControl, Field, FieldLabel, FieldError, FieldGroup } from "@hebo/shared-ui/components/Field";
import { Input } from "@hebo/shared-ui/components/Input";
import { Select } from "@hebo/shared-ui/components/Select";

import { useFormErrorToast } from "~console/lib/errors";


export const BranchCreateSchema = z.object({
  branchName: ((msg) => z.string(msg).trim().min(1, msg))("Please enter a branch name"),
  sourceBranchSlug: z.string(),
});
export type BranchCreateFormValues = z.infer<typeof BranchCreateSchema>;


type CreateBranchProps = {
  branches: {
    slug: string,
    name: string,
  }[]
};

export default function CreateBranch({ branches }: CreateBranchProps) {

  const fetcher = useFetcher();
  const [form, fields] = useForm<BranchCreateFormValues>({
    lastResult: fetcher.state === "idle" && fetcher.data,
    constraint: getZodConstraint(BranchCreateSchema),
    defaultValue: {
      sourceBranchSlug: branches[0].slug,
    },
  });
  useFormErrorToast(form.allErrors)

  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (fetcher.state === "idle" && form.status !== "error") {
      setOpen(false);
    }
  }, [fetcher.state, form.status]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div>
        <DialogTrigger render={
          <Button
            type="button"
            variant="outline"
          >
            + Create Branch
          </Button>
        } />
      </div>
      <DialogContent className="sm:max-w-lg">
        <FormControl form={form} as={fetcher.Form}>
          <DialogHeader>
            <DialogTitle>Create Branch</DialogTitle>
            <DialogDescription>
              Set a name and choose a source branch.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field name={fields.branchName.name}>
              <FieldLabel>Branch name</FieldLabel>
              <FieldControl render={
                <Input autoComplete="off" placeholder="Set a branch name" />
              } />
              <FieldError />
            </Field>

            <Field name={fields.sourceBranchSlug.name}>
              <FieldLabel>Source</FieldLabel>
              <FieldControl render={
                <Select
                  items={
                    branches.map(branch => ({
                      value: branch.slug,
                      label: (
                        <>
                          <GitBranch aria-hidden="true" />
                          {branch.name}
                        </>
                      ),
                    }))
                  }
                />
                } />
              <FieldError />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            } />
            <Button
              type="submit"
              name="intent"
              value="create"
              isLoading={fetcher.state !== "idle"}
              >
                Create
              </Button>
          </DialogFooter>
        </FormControl>
      </DialogContent>
    </Dialog>
  );
}
