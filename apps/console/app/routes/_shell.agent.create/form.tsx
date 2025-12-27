import { Form, useActionData, useNavigation } from "react-router";
import { useSnapshot } from "valtio";
import { z } from "zod";
import { useForm } from "@conform-to/react";
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
  FormControl,
  FieldControl,
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
  FieldContent,
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
  const navigation = useNavigation();

  const lastResult = useActionData();
  const [form, fields] = useForm<AgentCreateFormValues>({
    lastResult: navigation.state === "idle" && lastResult,
    constraint: getZodConstraint(AgentCreateSchema),
    defaultValue: {
      defaultModel: Object.keys(models ?? {})[0],
    }
  });
  useFormErrorToast(form.allErrors);

  return (
    <FormControl
      form={form}
      as={Form}
    >
      <Card className="sm:max-w-lg min-w-0 w-full ring-0 shadow-none bg-transparent">

        <CardHeader>
          <CardTitle><h1>Create a new agent</h1></CardTitle>
          <CardDescription>
            Each agent has its own set of models. Model choice usually depends on use case and pricing. <a href="https://docs.hebo.ai">Learn more</a>
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <FieldGroup>
            <Field name={fields.agentName.name} orientation="responsive">
              <FieldLabel>Agent Name</FieldLabel>
              <FieldContent>
                <FieldControl render={
                  <Input placeholder="Set an agent name" autoComplete="off" />
                  } />
                <FieldError />
              </FieldContent>
            </Field>

            <Field name={fields.defaultModel.name} orientation="responsive">
              <FieldLabel>Default Model</FieldLabel>
              <FieldContent>
                <FieldControl render={
                  <ModelSelector models={models} />
                  } />
                <FieldError />
              </FieldContent>
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
    </FormControl>
  );
}
