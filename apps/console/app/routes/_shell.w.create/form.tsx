import { useForm } from "@conform-to/react";
import { getZodConstraint } from "@conform-to/zod/v4";
import { Form, useActionData, useNavigation } from "react-router";

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

import { WorkspaceCreateSchema, type WorkspaceCreate } from "~api/modules/workspaces/types";
import { useFormErrorToast } from "~console/lib/errors";

import type { clientAction } from "./route";

export function WorkspaceCreateForm() {
  const navigation = useNavigation();

  const lastResult = useActionData<typeof clientAction>();
  const [form, fields] = useForm<WorkspaceCreate>({
    lastResult: navigation.state === "idle" ? lastResult : undefined,
    constraint: getZodConstraint(WorkspaceCreateSchema),
  });
  useFormErrorToast(form.allErrors);

  return (
    <FormControl form={form} as={Form}>
      <Card className="w-full min-w-0 bg-transparent shadow-none ring-0 @md:max-w-lg">
        <CardHeader>
          <CardTitle>
            <h1>Create a new workspace</h1>
          </CardTitle>
          <CardDescription>
            Workspaces group your presets, API keys, and team members.{" "}
            {/* oxlint-disable-next-line jsx-no-target-blank - safe for internal links */}
            <a href="https://hebo.ai/docs" target="_blank" rel="noopener">
              Learn more
            </a>
          </CardDescription>
        </CardHeader>

        <CardContent>
          <FieldGroup>
            <Field name={fields.name.name} orientation="responsive">
              <FieldLabel>Workspace Name</FieldLabel>
              <FieldContent>
                <FieldControl>
                  <Input placeholder="Set a workspace name" autoComplete="off" />
                </FieldControl>
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
