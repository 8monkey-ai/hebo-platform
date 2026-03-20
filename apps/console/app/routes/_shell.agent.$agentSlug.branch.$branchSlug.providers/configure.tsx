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

import { useFormErrorToast } from "~console/lib/errors";
import { labelize } from "~console/lib/utils";

const requiredString = (msg: string) => z.string(msg).trim().min(1, msg);

const BedrockIamRoleSchema = z.object({
  authMode: z.literal("iam-role"),
  bedrockRoleArn: requiredString("Please enter a valid Bedrock ARN role"),
  region: requiredString("Please enter a valid AWS region"),
});

const BedrockStaticSchema = z.object({
  authMode: z.literal("static"),
  accessKeyId: requiredString("Please enter a valid access key ID"),
  secretAccessKey: requiredString("Please enter a valid secret access key"),
  region: requiredString("Please enter a valid AWS region"),
});

const VertexWifSchema = z.object({
  authMode: z.literal("wif"),
  serviceAccountEmail: z.email("Please enter a valid service account email").trim().min(1),
  audience: requiredString("Please enter a valid audience"),
  location: requiredString("Please enter a valid location"),
  project: requiredString("Please enter a valid project"),
});

const VertexServiceAccountSchema = z.object({
  authMode: z.literal("service-account"),
  serviceAccountKey: requiredString("Please enter the service account JSON key"),
  location: requiredString("Please enter a valid location"),
  project: requiredString("Please enter a valid project"),
});

const AzureSchema = z.object({
  apiKey: requiredString("Please enter a valid API key"),
  resourceName: requiredString("Please enter a valid resource name"),
  apiVersion: z.string().optional(),
});

const ApiKeySchema = z.object({
  apiKey: requiredString("Please enter a valid API key"),
});

export const ProviderConfigureSchema = z.discriminatedUnion("slug", [
  z.object({
    slug: z.enum(["bedrock"]),
    config: z.discriminatedUnion("authMode", [BedrockIamRoleSchema, BedrockStaticSchema]),
  }),
  z.object({
    slug: z.enum(["vertex"]),
    config: z.discriminatedUnion("authMode", [VertexWifSchema, VertexServiceAccountSchema]),
  }),
  z.object({
    slug: z.enum(["azure"]),
    config: AzureSchema,
  }),
  z.object({
    slug: z.enum(["voyage", "groq", "anthropic", "openai"]),
    config: ApiKeySchema,
  }),
]);

type ProviderConfigureFormValues = z.infer<typeof ProviderConfigureSchema>;

type ConfigureProviderDialogProps = {
  provider?: { name: string; slug: string; config?: Record<string, unknown> };
} & React.ComponentProps<typeof Dialog>;

type AuthModeEntry = { value: string; label: string; schema: z.ZodObject<z.ZodRawShape> };

const providerAuthModes: Record<string, AuthModeEntry[]> = {
  bedrock: [
    { value: "iam-role", label: "IAM Role", schema: BedrockIamRoleSchema },
    { value: "static", label: "Static Credentials", schema: BedrockStaticSchema },
  ],
  vertex: [
    { value: "wif", label: "Workload Identity", schema: VertexWifSchema },
    { value: "service-account", label: "Service Account", schema: VertexServiceAccountSchema },
  ],
  azure: [{ value: "default", label: "API Key", schema: AzureSchema }],
};

const defaultAuthModes: AuthModeEntry[] = [{ value: "default", label: "Default", schema: ApiKeySchema }];

function getAuthModes(slug: string): AuthModeEntry[] {
  return providerAuthModes[slug] ?? defaultAuthModes;
}

function getConfigFields(schema: z.ZodObject<z.ZodRawShape>): string[] {
  return Object.keys(schema.shape).filter((k) => k !== "authMode");
}

export function ConfigureProviderDialog({ provider, ...props }: ConfigureProviderDialogProps) {
  const fetcher = useFetcher();
  const slug = provider?.slug ?? "";
  const modes = getAuthModes(slug);
  const hasTabs = modes.length > 1;
  const initialAuthMode = (provider?.config?.authMode as string) ?? modes[0].value;
  const [activeAuthMode, setActiveAuthMode] = useState(initialAuthMode);

  useEffect(() => {
    setActiveAuthMode((provider?.config?.authMode as string) ?? modes[0].value);
  }, [provider?.slug, provider?.config?.authMode, modes]);

  const [form, fields] = useForm<ProviderConfigureFormValues>({
    id: `${slug}-${activeAuthMode ?? "default"}`,
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
  const activeKeys = provider ? getConfigFields(activeMode.schema) : [];

  const renderFields = () => (
    <FieldGroup>
      <Field name={fields.slug.name} className="hidden">
        <FieldControl>
          <input type="hidden" />
        </FieldControl>
      </Field>

      {hasTabs && "authMode" in configFieldset && (
        <Field name={configFieldset.authMode.name} className="hidden">
          <FieldControl>
            <input type="hidden" value={activeAuthMode} />
          </FieldControl>
        </Field>
      )}

      {(activeKeys as (keyof typeof configFieldset)[]).map((key) => {
        const field = configFieldset[key];
        if (!field) return null;
        return (
          <Field key={key} name={field.name}>
            <FieldLabel>{labelize(key)}</FieldLabel>
            <FieldControl>
              <Input placeholder={`Set ${labelize(key).toLowerCase()}`} autoComplete="off" />
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

          {hasTabs ? (
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
