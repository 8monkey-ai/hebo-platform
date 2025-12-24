import { Form, useActionData, useNavigation } from "react-router";
import { z } from "zod";
import { useForm, getFormProps } from "@conform-to/react";
import { getZodConstraint } from "@conform-to/zod/v4";

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
  FieldControl,
  Field,
  FieldLabel,
  FieldError,
} from "@hebo/shared-ui/components/Field";
import { Input } from "@hebo/shared-ui/components/Input";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "@hebo/shared-ui/components/Item";

import { useFormErrorToast } from "~console/lib/errors";


export function createAgentDeleteSchema(agentSlug: string) {
  return z.object({
    slugConfirm: z.literal(agentSlug, "You must type your EXACT agent slug")
  });
}

export type AgentDeleteFormValues = z.infer<ReturnType<typeof createAgentDeleteSchema>>;

export function DangerSettings({ agent }: { agent: { slug: string }}) {

  const lastResult = useActionData();
  const [form, fields] = useForm<AgentDeleteFormValues>({
    id: agent.slug,
    lastResult,
    constraint: getZodConstraint(createAgentDeleteSchema(agent.slug)),
  });
  useFormErrorToast(form.allErrors);

  const navigation = useNavigation();

  return (
    <div className="flex flex-col gap-2">
      <h2>Danger Zone</h2>

      <Item variant="outline" className="bg-background border-destructive border-dashed">
        <ItemContent>
          <ItemTitle>Delete Agent</ItemTitle>
          <ItemDescription>
            Once you delete an agent, there is no going back. Be certain.
          </ItemDescription>
        </ItemContent>
        <ItemActions className="self-center">

          <Dialog>
            <DialogTrigger render={
              <Button variant="destructive">Delete agent</Button>
            } />

            <DialogContent>
              <Form method="post" {...getFormProps(form)} className="contents">
                <DialogHeader>
                  <DialogTitle>Delete Agent</DialogTitle>
                  <DialogDescription>
                    This will delete your agent irreversibly.
                  </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4">
                  <Alert variant="destructive">
                    <AlertTitle>
                      <strong>Warning:</strong> This action is not reversible.
                      Be certain.
                    </AlertTitle>
                  </Alert>

                  <Field field={fields.slugConfirm}>
                    <FieldLabel>
                      <div>
                        To confirm, type{" "}
                        <strong>{agent.slug}</strong> in
                        the box below:
                      </div>
                    </FieldLabel>
                    <FieldControl render={
                      <Input autoComplete="off" />
                      } />
                    <FieldError />
                  </Field>
                </div>

                <DialogFooter>
                  <DialogClose render={
                    <Button variant="outline" type="button">Cancel</Button>
                  } />
                  <Button isLoading={navigation.state !== "idle" && navigation.formData != null} type="submit">
                    Delete
                  </Button>
                </DialogFooter>
              </Field>
            </DialogContent>
          </Dialog>

        </ItemActions>
      </Item>
    </div>
  );
}
