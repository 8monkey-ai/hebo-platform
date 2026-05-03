import { useForm } from "@conform-to/react";
import { getZodConstraint } from "@conform-to/zod/v4";
import { useFetcher } from "react-router";
import { z } from "zod";

import { Alert, AlertTitle } from "@hebo/shared-ui/components/Alert";
import { Button } from "@hebo/shared-ui/components/Button";
import {
  Dialog,
  DialogFooter,
  DialogClose,
  DialogDescription,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogHeader,
} from "@hebo/shared-ui/components/Dialog";
import {
  FormControl,
  FieldControl,
  Field,
  FieldLabel,
  FieldError,
} from "@hebo/shared-ui/components/Field";
import { Input } from "@hebo/shared-ui/components/Input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@hebo/shared-ui/components/Item";

import { useFormErrorToast } from "~console/lib/errors";

import type { clientAction } from "../_shell.w.$workspaceSlug.settings.danger/route";

export function createWorkspaceDeleteSchema(workspaceSlug: string) {
  return z.object({
    slugConfirm: z.literal(workspaceSlug, "You must type your EXACT workspace slug"),
  });
}

type WorkspaceDeleteFormValues = z.infer<ReturnType<typeof createWorkspaceDeleteSchema>>;

export function DangerSettings({ workspace }: { workspace: { slug: string } }) {
  const fetcher = useFetcher<typeof clientAction>();

  const [form, fields] = useForm<WorkspaceDeleteFormValues>({
    lastResult: fetcher.state === "idle" ? fetcher.data : undefined,
    constraint: getZodConstraint(createWorkspaceDeleteSchema(workspace.slug)),
  });
  useFormErrorToast(form.allErrors);

  return (
    <div className="flex flex-col gap-2">
      <h2>Danger Zone</h2>

      <Item variant="outline" className="border-dashed border-destructive bg-background">
        <ItemContent>
          <ItemTitle>Delete Workspace</ItemTitle>
          <ItemDescription>
            Once you delete a workspace, there is no going back. Be certain.
          </ItemDescription>
        </ItemContent>
        <ItemActions className="self-center">
          <Dialog>
            <DialogTrigger render={<Button variant="destructive">Delete workspace</Button>} />

            <DialogContent>
              <FormControl form={form} as={fetcher.Form} action="danger">
                <DialogHeader>
                  <DialogTitle>Delete Workspace</DialogTitle>
                  <DialogDescription>
                    This will delete your workspace irreversibly.
                  </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4">
                  <Alert variant="destructive">
                    <AlertTitle>
                      <strong>Warning:</strong> This action is not reversible. Be certain.
                    </AlertTitle>
                  </Alert>

                  <Field name={fields.slugConfirm.name}>
                    <FieldLabel className="block">
                      To confirm, type <strong>{workspace.slug}</strong> in the box below:
                    </FieldLabel>
                    <FieldControl>
                      <Input autoComplete="off" />
                    </FieldControl>
                    <FieldError />
                  </Field>
                </div>

                <DialogFooter>
                  <DialogClose
                    render={
                      <Button variant="outline" type="button">
                        Cancel
                      </Button>
                    }
                  />
                  <Button
                    isLoading={fetcher.state !== "idle" && fetcher.formData != null}
                    type="submit"
                  >
                    Delete
                  </Button>
                </DialogFooter>
              </FormControl>
            </DialogContent>
          </Dialog>
        </ItemActions>
      </Item>
    </div>
  );
}
