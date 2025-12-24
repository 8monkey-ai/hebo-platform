import { Form, useActionData, useNavigation } from "react-router";
import { useSnapshot } from "valtio";
import { z } from "zod";
import { useForm, getFormProps } from "@conform-to/react";
import { getZodConstraint } from "@conform-to/zod/v4";

import { Button } from "@hebo/shared-ui/components/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@hebo/shared-ui/components/Card";
import {
  FieldControl,
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from "@hebo/shared-ui/components/Field";
import { Input } from "@hebo/shared-ui/components/Input";

import { ModelSelector } from "~console/components/ui/ModelSelector";
import { useFormErrorToast } from "~console/lib/errors";
import { shellStore } from "~console/lib/shell";


export const AgentCreateSchema = z.object({
  agentName: ((msg) => z.string(msg).trim().min(1, msg))("Please enter an agent name"),
  defaultModel: z.string(),
});
export type AgentCreateFormValues = z.infer<typeof AgentCreateSchema>;

export function AgentCreateForm() {
  const { models } = useSnapshot(shellStore);

  const lastResult = useActionData();
  const [form, fields] = useForm<AgentCreateFormValues>({
    lastResult,
    constraint: getZodConstraint(AgentCreateSchema),
    defaultValue: {
      defaultModel: Object.keys(models ?? {})[0],
    }
  });
  useFormErrorToast(form.allErrors);

  const navigation = useNavigation();

  return (
    <Form method="post" {...getFormProps(form)} className="contents">
      <Card className="sm:max-w-lg min-w-0 w-full ring-0 shadow-none bg-transparent">

        <CardHeader>
          <CardTitle><h1>Create a new agent</h1></CardTitle>
          <CardDescription>
            Each agent has its own set of models. Model choice usually depends on use case and pricing. <a href="https://docs.hebo.ai">Learn more</a>
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <FieldGroup>
            <Field field={fields.agentName} orientation="responsive">
              <FieldLabel>Agent Name</FieldLabel>
              <FieldControl render={
                <Input placeholder="Set an agent name" autoComplete="off" className="w-xs" />
                } />
              <FieldError />
            </Field>

            <Field field={fields.defaultModel} orientation="responsive">
              <FieldLabel>Default Model</FieldLabel>
              <FieldControl render={
                <ModelSelector models={models} className="w-xs" />
                } />
              <FieldError />
            </Field>
          </FieldGroup>
        </CardContent>

        <CardFooter className="flex justify-end">
          <Button
            type="submit"
            isLoading={navigation.state !== "idle" && navigation.formData != null}
          >
            Create
          </Button>
        </CardFooter>

      </Card>
    </Form>
  );
}
