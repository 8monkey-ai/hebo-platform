import { useFetcher } from "react-router";
import { useEffect, useRef, useState } from "react";
import { useForm, getFormProps, type FieldMetadata } from "@conform-to/react";
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
import {
  FieldControl,
  Field,
  FieldLabel,
  FieldError,
} from "@hebo/shared-ui/components/Field";
import { Input } from "@hebo/shared-ui/components/Input";
import { Select } from "@hebo/shared-ui/components/Select";
import { Separator } from "@hebo/shared-ui/components/Separator";
import { CopyButton } from "@hebo/shared-ui/components/CopyButton";
import { Badge } from "@hebo/shared-ui/components/Badge";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@hebo/shared-ui/components/Item";
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
import { Label } from "@hebo/shared-ui/components/Label";

import { useFormErrorToast } from "~console/lib/errors";
import { objectId } from "~console/lib/utils";
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
    id: objectId(models),
    lastResult: fetcher.data,
    constraint: getZodConstraint(modelsConfigFormSchema),
    defaultValue: { 
      models
    }
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
  const modelItems = fields.models.getFieldList();

  return (
    <fetcher.Form method="post" ref={formRef} {...getFormProps(form)} className="flex flex-col gap-4">
      {modelItems.map((model, index) => (
        <ModelCard
          key={model.key}
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
            setTimeout(() => formRef.current?.requestSubmit(), 1000);
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
            setExpandedCardId(modelItems.length);
          }}
          disabled={expandedCardId !== null}
        >
          + Add Model
        </Button>
      </div>
    </fetcher.Form>
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

  const { models } = useSnapshot(shellStore);

  const modelFieldset = model.getFieldset();
  const aliasPath = [agentSlug, branchSlug, modelFieldset.alias.value || "alias"].join("/");

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const routingOnlyField = modelFieldset.routing.getFieldset().only;
  const [routingEnabled, setRoutingEnabled] = useState(Boolean(routingOnlyField.value));

  return (
    <Collapsible open={isExpanded} onOpenChange={onOpenChange}>
      <Card size="sm">
        <CardHeader className="grid gap-4 min-w-0 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
          <div className="flex min-w-0 flex-col gap-2">
            <span className="text-xs uppercase text-muted-foreground">Alias path</span>
            <div className="inline-flex gap-2 items-center">
              <span className="text-sm font-medium text-ellipsis-start">{aliasPath}</span>
              <CopyButton value={aliasPath} />
            </div>
          </div>

          <Badge variant="outline">
            <Brain />
            {modelFieldset.type.value ?? "undefined"}
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
            overflow-hidden
            h-(--collapsible-panel-height)
            [&[data-starting-style],&[data-ending-style]]:h-0
            transition-all duration-150 ease-out
            "
          >
            <Separator />

            <CardContent className="flex flex-col gap-4 my-3">

              {/* FUTURE: follow layout pattern of new shadcn fields components */}
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                <Field field={modelFieldset.alias} className="flex flex-col gap-2">
                  <FieldLabel>Alias</FieldLabel>
                  <FieldControl render={
                    <Input placeholder="Set alias name" autoComplete="off" />
                    } /> 
                  <FieldError />
                </Field>

                <Field field={modelFieldset.type} className="flex flex-col gap-2">
                  <FieldLabel>Type</FieldLabel>
                  <FieldControl render={
                    <ModelSelector models={models} />
                    } />
                  <FieldError />
                </Field>
              </div>

              <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <div className="flex items-center gap-1">
                  <h4 className="text-sm font-medium">Advanced options</h4>
                  <CollapsibleTrigger render={
                    <Button variant="ghost" size="icon" className="size-6" type="button">
                      <ChevronsUpDown />
                    </Button>
                  } />
                </div>
                <CollapsibleContent keepMounted inert={!advancedOpen} className="overflow-hidden h-(--collapsible-panel-height)">
                  <Item variant="outline" size="sm">
                    <ItemMedia className="pt-1">
                      <input
                        id={`byo-${aliasPath}`}
                        type="checkbox"
                        checked={routingEnabled}
                        onChange={(e) => setRoutingEnabled(e.target.checked)}
                        className="h-4 w-4 accent-primary"
                        aria-label="Enable bring your own provider routing"
                      />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>
                        <Label htmlFor={`byo-${aliasPath}`} className="mb-0">Bring Your Own Provider</Label>
                      </ItemTitle>
                      <ItemDescription className="line-clamp-1">Setup your credentials first in providers settings</ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      {(() => {
                        const availableProviders = providers.filter((p) => models?.[modelFieldset.type.value ?? ""]?.providers?.includes(p.slug));
                        return (
                          <Select
                            disabled={!routingEnabled}
                            name={`${model.name}.routing.only[0]`}
                            defaultValue={routingOnlyField.getFieldList()[0]?.value ?? ""}
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
                          />
                        )
                      })()}
                    </ItemActions>
                  </Item>
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
