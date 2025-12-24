import { useEffect } from "react";
import { useFetcher } from "react-router";
import { z } from "zod";

import { getFormProps, useForm } from "@conform-to/react";
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
} from "@hebo/shared-ui/components/Dialog";
import { FieldControl, Field, FieldLabel, FieldError } from "@hebo/shared-ui/components/Field";
import { Input } from "@hebo/shared-ui/components/Input";

import { useFormErrorToast } from "~console/lib/errors";
import { labelize } from "~console/lib/utils";


export const ProviderConfigureSchema = z.discriminatedUnion("slug", [
  z.object({
    slug: z.enum(["bedrock"]),
    config: z.object({
      bedrockRoleArn: ((msg) => z.string(msg).trim().min(1, msg))("Please enter a valid Bedrock ARN role"),
      region: ((msg) => z.string(msg).trim().min(1, msg))("Please enter a valid AWS region"),
    }),
  }),
  z.object({
    slug: z.enum(["vertex"]),
    config: z.object({
      serviceAccountEmail: ((msg) => z.email(msg).trim().min(1, msg))("Please enter a valid service account email"),
      audience: ((msg) => z.string(msg).trim().min(1, msg))("Please enter a valid audience"),
      location: ((msg) => z.string(msg).trim().min(1, msg))("Please enter a valid location"),
      project: ((msg) => z.string(msg).trim().min(1, msg))("Please enter a valid project"),
    }),
  }),
  z.object({
    slug: z.enum(["cohere", "groq"]),
    config: z.object({
      apiKey: ((msg) => z.string(msg).trim().min(1, msg))("Please enter a valid API key"),
    }),
  }),
]);

type ProviderConfigureFormValues = z.infer<typeof ProviderConfigureSchema>;


type ConfigureProviderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider?: { name: string; slug: string; };
};

export function ConfigureProviderDialog({ open, onOpenChange, provider }: ConfigureProviderDialogProps) {
  const fetcher = useFetcher();

  const [form, fields] = useForm<ProviderConfigureFormValues>({
    id: provider?.slug,
    lastResult: fetcher.data?.submission,
    constraint: getZodConstraint(ProviderConfigureSchema),
    defaultValue: { 
      slug: provider?.slug,
    }
  });
  useFormErrorToast(form.allErrors);
  
  useEffect(() => {
    if (fetcher.state === "idle" && form.status !== "error") {
      onOpenChange(false);
    }
  }, [fetcher.state, form.status]);

  const providerFields = Object.fromEntries(
    ProviderConfigureSchema.options.flatMap((opt) => {
      const slugEnum = opt.shape.slug as z.ZodEnum<any>;
      const configSchema = opt.shape.config as z.ZodObject<any>;
      const fields = Object.keys(configSchema.shape);
      return slugEnum.options.map((value: string) => [value, fields]);
    })
  );
    
  const configFieldset = fields.config.getFieldset();
  const activeKeys = provider ? providerFields[provider.slug] ?? [] : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <fetcher.Form
          method="post"
          {...getFormProps(form)}
          className="contents"
        >
          <DialogHeader>
            <DialogTitle>Configure {provider?.name} Credentials</DialogTitle>
            <DialogDescription>Learn how to retrieve the credentials in our documentation.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <Field field={fields.slug} className="hidden">
              <FieldControl render={
                <input type="hidden" value={provider?.slug} />
                } />
            </Field>

            {(activeKeys as (keyof typeof configFieldset)[]).map((key) => {
              const field = configFieldset[key];
              return (
                <Field key={key} field={field}>
                  <FieldLabel>{labelize(key)}</FieldLabel>
                  <FieldControl render={
                    <Input placeholder={`Set ${labelize(key).toLowerCase()}`} autoComplete="off" />
                    } />
                  <FieldError />
                </Field>
              )
            })}
          </div>

          <div className="text-sm">
            The configured provider will only handle requests after you enable it for a specific model. 
          </div>

          <DialogFooter>
            <DialogClose render={
              <Button 
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  >
                  Cancel
              </Button>
            } />
            <Button
                type="submit"
                name="intent"
                value="configure"
                isLoading={fetcher.state !== "idle"}
                >
                Set
            </Button>
          </DialogFooter>
        </fetcher.Form>
      </DialogContent>
    </Dialog>
  );
}
