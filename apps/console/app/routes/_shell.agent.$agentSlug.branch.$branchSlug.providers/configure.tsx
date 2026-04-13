import { useForm } from "@conform-to/react";
import { getZodConstraint } from "@conform-to/zod/v4";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { z } from "zod";

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
import {
  FormControl,
  FieldControl,
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from "@hebo/shared-ui/components/Field";
import { Input } from "@hebo/shared-ui/components/Input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@hebo/shared-ui/components/Tabs";
import { Textarea } from "@hebo/shared-ui/components/Textarea";

import { useFormErrorToast } from "~console/lib/errors";
import { labelize } from "~console/lib/utils";

import type { clientAction } from "./route";

const requiredString = (msg: string) => z.string(msg).trim().min(1, msg);
const requiredEmail = (msg: string) => z.email(msg);
const textareaString = (msg: string) => requiredString(msg).meta({ text: true });

const BedrockIamRoleSchema = z.object({
  authMode: z.literal("iam-role"),
  bedrockRoleArn: requiredString("Please enter a valid Bedrock ARN role"),
  region: requiredString("Please enter a valid AWS region"),
});

const BedrockAccessKeySchema = z.object({
  authMode: z.literal("access-key"),
  accessKeyId: requiredString("Please enter a valid access key ID"),
  secretAccessKey: requiredString("Please enter a valid secret access key"),
  region: requiredString("Please enter a valid AWS region"),
});

const VertexIdentityFederationSchema = z.object({
  authMode: z.literal("identity-federation"),
  serviceAccountEmail: requiredEmail("Please enter a valid service account email"),
  audience: requiredString("Please enter a valid audience"),
  location: requiredString("Please enter a valid location"),
  project: requiredString("Please enter a valid project"),
});

const VertexServiceAccountSchema = z.object({
  authMode: z.literal("service-account"),
  clientEmail: requiredEmail("Please enter a valid service account email"),
  privateKey: textareaString("Please enter the private key"),
  location: requiredString("Please enter a valid location"),
  project: requiredString("Please enter a valid project"),
});

const AzureSchema = z.object({
  authMode: z.literal("resource-api-key"),
  resourceName: requiredString("Please enter a valid resource name"),
  apiKey: requiredString("Please enter a valid API key"),
});

const ApiKeySchema = z.object({
  authMode: z.literal("api-key"),
  apiKey: requiredString("Please enter a valid API key"),
});

export const ProviderConfigureSchema = z.discriminatedUnion("slug", [
  z.object({
    slug: z.enum(["bedrock"]),
    config: z.discriminatedUnion("authMode", [BedrockIamRoleSchema, BedrockAccessKeySchema]),
  }),
  z.object({
    slug: z.enum(["vertex"]),
    config: z.discriminatedUnion("authMode", [
      VertexIdentityFederationSchema,
      VertexServiceAccountSchema,
    ]),
  }),
  z.object({
    slug: z.enum(["azure"]),
    config: z.discriminatedUnion("authMode", [AzureSchema]),
  }),
  z.object({
    slug: z.enum(["voyage", "groq", "anthropic", "openai"]),
    config: z.discriminatedUnion("authMode", [ApiKeySchema]),
  }),
]);

type ProviderConfigureFormValues = z.infer<typeof ProviderConfigureSchema>;

type ConfigureProviderDialogProps = {
  provider?: { name: string; slug: string; config?: Record<string, unknown> };
} & React.ComponentProps<typeof Dialog>;

function getProviderModes(slug: string) {
  const entry = ProviderConfigureSchema.options.find((o) =>
    (o.shape.slug.options as string[]).includes(slug),
  );
  if (!entry) return [];

  return entry.shape.config.options.map((opt) => {
    const value = opt.shape.authMode.value;
    return { value, label: labelize(value), schema: opt };
  });
}

function getConfigFields(schema: z.ZodObject<z.ZodRawShape>): string[] {
  return Object.keys(schema.shape).filter((k) => k !== "authMode");
}

function isTextarea(schema: z.ZodObject<z.ZodRawShape>, key: string): boolean {
  const field = schema.shape[key] as z.ZodType & {
    meta?: () => { text?: boolean } | undefined;
  };

  return field.meta?.()?.text === true;
}

export function ConfigureProviderDialog({ provider, ...props }: ConfigureProviderDialogProps) {
  const fetcher = useFetcher<typeof clientAction>();

  const modes = getProviderModes(provider?.slug ?? "");

  const defaultAuthMode =
    modes.find((m) => m.value === provider?.config?.authMode)?.value ?? modes[0]?.value ?? "";

  const [activeAuthMode, setActiveAuthMode] = useState(defaultAuthMode);

  useEffect(() => {
    setActiveAuthMode(defaultAuthMode);
  }, [defaultAuthMode]);

  const [form, fields] = useForm<ProviderConfigureFormValues>({
    id: `${provider?.slug}-${activeAuthMode ?? "default"}`,
    lastResult: fetcher.state === "idle" ? fetcher.data?.submission : undefined,
    constraint: getZodConstraint(ProviderConfigureSchema),
    defaultValue: {
      ...provider,
    },
  });
  useFormErrorToast(form.allErrors);

  useEffect(() => {
    if (fetcher.state === "idle" && form.status !== "error") {
      props.onOpenChange?.(false, {} as never);
    }
    // oxlint-disable-next-line exhaustive-deps
  }, [fetcher.state, form.status]);

  const configFieldset = fields.config.getFieldset();
  const activeMode = modes.find((m) => m.value === activeAuthMode) ?? modes[0];
  const activeKeys = provider && activeMode ? getConfigFields(activeMode.schema) : [];

  const renderFields = () => (
    <FieldGroup>
      <Field name={fields.slug.name} className="hidden">
        <FieldControl>
          <input type="hidden" />
        </FieldControl>
      </Field>

      <Field name={configFieldset.authMode.name} className="hidden">
        <FieldControl>
          <input type="hidden" value={activeAuthMode} />
        </FieldControl>
      </Field>

      {(activeKeys as (keyof typeof configFieldset)[]).map((key) => {
        const field = configFieldset[key];
        return (
          <Field key={key} name={field.name}>
            <FieldLabel>{labelize(key)}</FieldLabel>
            <FieldControl>
              {isTextarea(activeMode.schema, key) ? (
                <Textarea
                  placeholder={`Set ${labelize(key).toLowerCase()}`}
                  autoComplete="off"
                  rows={4}
                />
              ) : (
                <Input placeholder={`Set ${labelize(key).toLowerCase()}`} autoComplete="off" />
              )}
            </FieldControl>
            <FieldError />
          </Field>
        );
      })}
    </FieldGroup>
  );

  return (
    <Dialog {...props}>
      <DialogContent className="sm:max-w-lg">
        <FormControl form={form} as={fetcher.Form}>
          <DialogHeader>
            <DialogTitle>Configure {provider?.name} Credentials</DialogTitle>
            <DialogDescription>
              Learn how to retrieve the credentials in our documentation.
            </DialogDescription>
          </DialogHeader>

          {modes.length > 1 ? (
            <Tabs value={activeAuthMode} onValueChange={setActiveAuthMode}>
              <TabsList>
                {modes.map((mode) => (
                  <TabsTrigger key={mode.value} value={mode.value}>
                    {mode.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {modes.map((mode) => (
                <TabsContent key={mode.value} value={mode.value}>
                  {activeAuthMode === mode.value && renderFields()}
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            renderFields()
          )}

          <div className="text-sm">
            The configured provider will only handle requests after you enable it for a specific
            model.
          </div>

          <DialogFooter>
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => props.onOpenChange?.(false, {} as never)}
                >
                  Cancel
                </Button>
              }
            />
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
