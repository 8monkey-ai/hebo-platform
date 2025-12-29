import { useEffect } from "react";
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
} from "@hebo/shared-ui/components/Dialog";
import { FormControl, FieldControl, Field, FieldLabel, FieldError, FieldGroup } from "@hebo/shared-ui/components/Field";
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
  provider?: { name: string; slug: string; config: Record<string, unknown>; };
} & React.ComponentProps<typeof Dialog>;

export function ConfigureProviderDialog({ provider, ...props }: ConfigureProviderDialogProps) {
  const fetcher = useFetcher();

  const [form, fields] = useForm<ProviderConfigureFormValues>({
    id: provider?.slug,
    lastResult: fetcher.state === "idle" ? fetcher.data?.submission : undefined,
    constraint: getZodConstraint(ProviderConfigureSchema),
    defaultValue: { 
      ...provider
    }
  });
  useFormErrorToast(form.allErrors);
  
  useEffect(() => {
    if (fetcher.state === "idle" && form.status !== "error") {
      props.onOpenChange(false);
    }
  }, [fetcher.state, form.status]);

  const providerFields = Object.fromEntries(
    ProviderConfigureSchema.options.flatMap((opt) => {
      const slugEnum = opt.shape.slug;
      const configKeys = Object.keys(opt.shape.config.shape);
      return slugEnum.options.map((slug) => [slug, configKeys]);
    })
  );
    
  const configFieldset = fields.config.getFieldset();
  const activeKeys = provider ? providerFields[provider.slug] ?? [] : [];

  return (
    <Dialog {...props}>
      <DialogContent className="sm:max-w-lg">
        <FormControl form={form} as={fetcher.Form}>
          <DialogHeader>
            <DialogTitle>Configure {provider?.name} Credentials</DialogTitle>
            <DialogDescription>Learn how to retrieve the credentials in our documentation.</DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field name={fields.slug.name} className="hidden">
              <FieldControl>
                <input type="hidden" />
              </FieldControl>
            </Field>

            {(activeKeys as (keyof typeof configFieldset)[]).map((key) => {
              const field = configFieldset[key];
              return (
                <Field key={key} name={field.name}>
                  <FieldLabel>{labelize(key)}</FieldLabel>
                  <FieldControl>
                    <Input placeholder={`Set ${labelize(key).toLowerCase()}`} autoComplete="off" />
                  </FieldControl>
                  <FieldError />
                </Field>
              )
            })}
          </FieldGroup>

          <div className="text-sm">
            The configured provider will only handle requests after you enable it for a specific model. 
          </div>

          <DialogFooter>
            <DialogClose render={
              <Button 
                type="button"
                variant="ghost"
                onClick={() => props.onOpenChange(false)}
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
        </FormControl>
      </DialogContent>
    </Dialog>
  );
}
