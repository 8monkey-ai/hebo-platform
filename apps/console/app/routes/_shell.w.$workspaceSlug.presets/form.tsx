import { useForm } from "@conform-to/react";
import { getZodConstraint } from "@conform-to/zod/v4";
import { Brain, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import slugify from "slugify";
import { useSnapshot } from "valtio";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@hebo/shared-ui/components/AlertDialog";
import { Badge } from "@hebo/shared-ui/components/Badge";
import { Button } from "@hebo/shared-ui/components/Button";
import { Card, CardContent, CardHeader } from "@hebo/shared-ui/components/Card";
import { CopyButton } from "@hebo/shared-ui/components/CopyButton";
import {
  Field,
  FieldControl,
  FieldError,
  FieldGroup,
  FieldLabel,
  FormControl,
} from "@hebo/shared-ui/components/Field";
import { Input } from "@hebo/shared-ui/components/Input";

import type { PresetPlain } from "~api/modules/presets/types";
import { ModelSelector } from "~console/components/ui/ModelSelector";
import { useFormErrorToast } from "~console/lib/errors";
import { shellStore } from "~console/lib/shell";

import type { clientAction } from "./route";
import {
  presetCreateFormSchema,
  type PresetCreateFormValues,
} from "./schema";

export default function PresetsList({ presets }: { presets: PresetPlain[] }) {
  return (
    <div className="flex flex-col gap-4">
      {presets.map((preset) => (
        <PresetCard key={preset.id} preset={preset} />
      ))}

      <CreatePresetCard />
    </div>
  );
}

function PresetCard({ preset }: { preset: PresetPlain }) {
  const fetcher = useFetcher<typeof clientAction>();

  return (
    <Card size="sm">
      <CardHeader className="grid min-w-0 gap-4 @md:grid-cols-[minmax(0,1fr)_auto_auto] @md:items-center">
        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-xs text-muted-foreground uppercase">Preset</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{preset.name}</span>
            <Badge variant="outline">
              <span className="text-ellipsis-start">{preset.slug}</span>
              <CopyButton value={preset.slug} />
            </Badge>
          </div>
        </div>

        <Badge variant="outline">
          <Brain />
          {preset.model}
        </Badge>

        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete preset ${preset.slug}`}
                disabled={fetcher.state !== "idle"}
              >
                <Trash2 />
              </Button>
            }
          />
          <AlertDialogContent>
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="delete" />
              <input type="hidden" name="slug" value={preset.slug} />
              <AlertDialogHeader>
                <AlertDialogTitle>Delete preset</AlertDialogTitle>
                <AlertDialogDescription>
                  Remove preset <strong>{preset.slug}</strong>? Applications using this slug will
                  fall back to canonical model resolution.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  type="submit"
                  isLoading={fetcher.state !== "idle"}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </fetcher.Form>
          </AlertDialogContent>
        </AlertDialog>
      </CardHeader>
    </Card>
  );
}

function CreatePresetCard() {
  const fetcher = useFetcher<typeof clientAction>();
  const { models } = useSnapshot(shellStore);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  const submission =
    fetcher.state === "idle" && fetcher.data && "submission" in fetcher.data
      ? fetcher.data.submission
      : undefined;

  const [form, fields] = useForm<PresetCreateFormValues>({
    lastResult: submission,
    constraint: getZodConstraint(presetCreateFormSchema),
  });
  useFormErrorToast(form.allErrors);

  useEffect(() => {
    if (submission?.status === "success") {
      setOpen(false);
      setName("");
      setSlug("");
      setSlugEdited(false);
    }
  }, [submission]);

  if (!open) {
    return (
      <div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setOpen(true);
          }}
        >
          + Add Preset
        </Button>
      </div>
    );
  }

  return (
    <Card size="sm">
      <CardHeader>
        <h3 className="text-sm font-medium">New Preset</h3>
      </CardHeader>
      <CardContent>
        <FormControl form={form} as={fetcher.Form} className="flex flex-col gap-4">
          <input type="hidden" name="intent" value="create" />
          <FieldGroup className="grid grid-cols-1 gap-4 @md:grid-cols-2">
            <Field name={fields.name.name}>
              <FieldLabel>Name</FieldLabel>
              <FieldControl>
                <Input
                  placeholder="My fast preset"
                  autoComplete="off"
                  value={name}
                  onChange={(e) => {
                    const next = e.target.value;
                    setName(next);
                    if (!slugEdited) {
                      setSlug(slugify(next, { lower: true, strict: true }));
                    }
                  }}
                />
              </FieldControl>
              <FieldError />
            </Field>
            <Field name={fields.slug.name}>
              <FieldLabel>Slug</FieldLabel>
              <FieldControl>
                <Input
                  placeholder="my-fast-preset"
                  autoComplete="off"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugEdited(true);
                  }}
                />
              </FieldControl>
              <FieldError />
            </Field>
          </FieldGroup>

          <Field name={fields.model.name}>
            <FieldLabel>Model</FieldLabel>
            <FieldControl>
              <ModelSelector models={models} />
            </FieldControl>
            <FieldError />
          </Field>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={fetcher.state !== "idle"}>
              Create
            </Button>
          </div>
        </FormControl>
      </CardContent>
    </Card>
  );
}
