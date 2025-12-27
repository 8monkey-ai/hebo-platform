import { useFetcher } from "react-router";
import { useEffect, useRef, useState } from "react";
import { useForm, type FieldMetadata } from "@conform-to/react";
import { getZodConstraint } from "@conform-to/zod/v4";
import { Brain, ChevronsUpDown, Edit } from "lucide-react";
import { useSnapshot } from "valtio";

import { Button } from "@hebo/shared-ui/components/Button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@hebo/shared-ui/components/Card";
import { Checkbox } from "@hebo/shared-ui/components/Checkbox";
import {
  FieldControl,
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
  FieldContent,
  FieldDescription,
  FormControl,
} from "@hebo/shared-ui/components/Field";
import { Input } from "@hebo/shared-ui/components/Input";
import { Select } from "@hebo/shared-ui/components/Select";
import { Separator } from "@hebo/shared-ui/components/Separator";
import { CopyButton } from "@hebo/shared-ui/components/CopyButton";
import { Badge } from "@hebo/shared-ui/components/Badge";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@hebo/shared-ui/components/Collapsible";

import { useFormErrorToast } from "~console/lib/errors";
import { shellStore } from "~console/lib/shell";
import { ModelSelector } from "~console/components/ui/ModelSelector";

import {
  modelsConfigFormSchema,
  type ModelConfigFormValue,
  type ModelsConfigFormValues,
} from "./schema";


type ModelsConfigProps = {
  agentSlug: string;
  branchSlug: string;
  models?: ModelsConfigFormValues["models"];
  providers: Array<{ slug: string; name: string }>;
};

export default function ModelsConfigForm({ agentSlug, branchSlug, models, providers }: ModelsConfigProps) {
  const fetcher = useFetcher();

  const [form, fields] = useForm<ModelsConfigFormValues>({
    lastResult: fetcher.state === "idle" && fetcher.data,
    constraint: getZodConstraint(modelsConfigFormSchema),
    defaultValue: { models }
  });
  useFormErrorToast(form.allErrors);

  // Close the active card on successful submit
  const [expandedCardId, setExpandedCardId] = useState<number | null>(null);
  useEffect(() => {
    if (fetcher.state === "idle" && form.status !== "error") {
      if (!form.dirty) {
        setExpandedCardId(null);
      }
    }
  }, [fetcher.state, form.status]);

  const formRef = useRef<HTMLFormElement>(null);

  return (
    <FormControl
      form={form}
      as={fetcher.Form}
      ref={formRef}
      className="flex flex-col gap-4"
    >
      {fields.models.getFieldList().map((model, index) => (
        <ModelCard
          key={model.name}
          model={model}
          agentSlug={agentSlug}
          branchSlug={branchSlug}
          providers={providers}
          isExpanded={expandedCardId === index}
          onOpenChange={(open) => { 
            form.dirty && form.reset({ name: fields.models.name  });
            open && setExpandedCardId(index);
          }}
          onRemove={() => {
            setExpandedCardId(null);
            form.remove({ name: fields.models.name, index })
            // FUTURE: this is a quirk to work around a current Conform limitation. 
            // Remove once upgrade to future APIs in conform 1.9+
            setTimeout(() => formRef.current?.requestSubmit(), 2000);
          }}
          onCancel={() => {
            form.dirty && form.reset({ name: fields.models.name  });
            setExpandedCardId(null);
          }}
          isSubmitting={fetcher.state === "submitting"}
        />
      ))}

      <div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            form.insert({
              name: fields.models.name,
            });
            setExpandedCardId(fields.models.getFieldList().length);
          }}
          disabled={expandedCardId !== null}
        >
          + Add Model
        </Button>
      </div>
    </FormControl>
  );
}


function ModelCard(props: {
  model: FieldMetadata<ModelConfigFormValue>;
  agentSlug: string;
  branchSlug: string;
  isExpanded: boolean;
  onOpenChange: (open: boolean) => void;
  onRemove: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  providers: ModelsConfigProps["providers"];
}) {
  const {
    model,
    agentSlug,
    branchSlug,
    isExpanded,
    onOpenChange,
    onRemove,
    onCancel,
    isSubmitting,
    providers,
  } = props;

  const { models: supportedModels } = useSnapshot(shellStore);
  const availableProviders = providers.filter((p) => supportedModels?.[model.getFieldset().type.value ?? ""]?.providers?.includes(p.slug));

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [routingEnabled, setRoutingEnabled] = useState(Boolean(model.getFieldset().routing.value));

  const aliasPath = [agentSlug, branchSlug, model.getFieldset().alias.value || "alias"].join("/");

  const cardRef = useRef<HTMLDivElement>(null); 
  useEffect(() => {
    if (isExpanded) cardRef.current?.focus();
  }, [isExpanded]);

  return (
    <Collapsible 
      open={isExpanded}
      onOpenChange={onOpenChange}>
      <Card size="sm">
        <CardHeader className="grid gap-4 min-w-0 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center focus:outline-none focus:ring-2 focus:ring-ring/40 focus:ring-offset-2 focus:ring-offset-background">
          <div className="flex min-w-0 flex-col gap-2">
            <span className="text-xs uppercase text-muted-foreground">Alias path</span>
            <div className="inline-flex gap-2 items-center">
              <span className="text-sm font-medium text-ellipsis-start">{aliasPath}</span>
              <CopyButton value={aliasPath} />
            </div>
          </div>

          <Badge variant="outline">
            <Brain />
            {model.getFieldset().type.value ?? "undefined"}
          </Badge>

          <CollapsibleTrigger render={
            <Button type="button" variant="outline" disabled={isExpanded}>
              <Edit />
              Edit
            </Button>
          } />
        </CardHeader>

        <CollapsibleContent 
          keepMounted
          inert={!isExpanded}
          className="
            h-(--collapsible-panel-height)
            [&[data-starting-style],&[data-ending-style]]:h-0
            transition-all duration-150 ease-out
            "
          >

          <Separator />

          <CardContent ref={cardRef} tabIndex={-1} className="flex flex-col gap-4 my-3">
            <FieldGroup className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <Field name={model.getFieldset().alias.name}>
                <FieldLabel>Alias</FieldLabel>
                <FieldControl>
                  <Input placeholder="Set alias name" autoComplete="off" />
                </FieldControl> 
                <FieldError />
              </Field>

              <Field name={model.getFieldset().type.name}>
                <FieldLabel>Type</FieldLabel>
                <FieldControl>
                  <ModelSelector models={supportedModels} />
                </FieldControl>
                <FieldError />
              </Field>
            </FieldGroup>

            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <div className="flex items-center gap-1">
                <h4 className="text-sm font-medium">Advanced options</h4>
                <CollapsibleTrigger render={
                  <Button variant="ghost" size="icon" className="size-6" type="button">
                    <ChevronsUpDown />
                  </Button>
                } />
              </div>
              <CollapsibleContent keepMounted inert={!advancedOpen} className="overflow-hidden h-(--collapsible-panel-height) pt-2">
                <Field orientation="horizontal" className="border border-border px-4 py-3.5">
                  <Checkbox
                    id={`byo-${aliasPath}`}
                    checked={routingEnabled}
                    onCheckedChange={setRoutingEnabled}
                  />
                  <FieldContent>
                    <FieldLabel htmlFor={`byo-${aliasPath}`}>Bring Your Own Provider</FieldLabel>
                    <FieldDescription>Setup your credentials first in providers settings</FieldDescription>
                  </FieldContent>
                  <Field
                    name={`${model.getFieldset().routing.getFieldset().only.name}[0]`} 
                    className="max-w-44">
                    <FieldControl disabled={!routingEnabled}>
                      <Select
                        items={
                          availableProviders
                            .map((provider) => ({
                              value: provider.slug,
                              label: provider.name,
                            }))
                          }
                        placeholder={
                          availableProviders.length
                            ? "Select provider"
                            : "No supported providers configured"
                        }
                        aria-label="Select Provider"
                      />
                    </FieldControl>
                  </Field>
                </Field>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>

          <CardFooter>
            <Dialog>
              <DialogTrigger render={
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isSubmitting}
                >
                  Remove
                </Button>
              } />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Remove model</DialogTitle>
                  <DialogDescription>
                    This action permanently removes the model and cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose render={
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  } />

                  <Button
                    type="button"
                    variant="destructive"
                    onClick={onRemove}
                    isLoading={isSubmitting}
                  >
                    Remove
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="ml-auto flex gap-2">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={!model.dirty} isLoading={isSubmitting}>
                Save
              </Button>
            </div>
          </CardFooter>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
