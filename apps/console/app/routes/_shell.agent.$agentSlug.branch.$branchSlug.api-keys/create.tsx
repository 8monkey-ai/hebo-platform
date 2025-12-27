import { Info } from "lucide-react";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { z } from "zod";

import { useForm } from "@conform-to/react";
import { getZodConstraint } from "@conform-to/zod/v4";

import { Alert, AlertTitle } from "@hebo/shared-ui/components/Alert";
import { Button } from "@hebo/shared-ui/components/Button";
import { Checkbox } from "@hebo/shared-ui/components/Checkbox";
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
import { FieldControl, Field, FieldLabel, FieldError, FieldGroup, FormControl } from "@hebo/shared-ui/components/Field";
import { Input } from "@hebo/shared-ui/components/Input";
import { Label } from "@hebo/shared-ui/components/Label";
import { Select } from "@hebo/shared-ui/components/Select";

import { useFormErrorToast } from "~console/lib/errors";


const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const API_KEY_EXPIRATION_OPTIONS = [
  { label: "1 day", value: "1d", durationMs: 1 * DAY_IN_MS },
  { label: "7 days", value: "7d", durationMs: 7 * DAY_IN_MS },
  { label: "30 days", value: "30d", durationMs: 30 * DAY_IN_MS },
  { label: "90 days", value: "90d", durationMs: 90 * DAY_IN_MS },
  { label: "1 year", value: "365d", durationMs: 365 * DAY_IN_MS },
] as const;

export const ApiKeyCreateSchema = z.object({
  description: ((msg) => z.string(msg).trim().min(1, msg))("Please enter a description"),
  expiresIn: z.literal(
    API_KEY_EXPIRATION_OPTIONS.map((option) => option.value),
    "Select an expiration window",
  ),
});

type ApiKeyCreateFormValues = z.infer<typeof ApiKeyCreateSchema>;

export function CreateApiKeyDialog() {
  const fetcher = useFetcher();

  const [form, fields] = useForm<ApiKeyCreateFormValues>({
    lastResult: fetcher.state === "idle" && fetcher.data?.submission,
    constraint: getZodConstraint(ApiKeyCreateSchema),
    defaultValue: {
      expiresIn: "30d",
    },
  });
  useFormErrorToast(form.allErrors);

  const [createOpen, createSetOpen] = useState(false);
  const [revealOpen, setRevealOpen] = useState(false);
  useEffect(() => {
    if (fetcher.state === "idle" && form.status !== "error") {
      createSetOpen(false);
      if (fetcher.data?.apiKey) {
        setRevealOpen(true);
      }
    }
  }, [fetcher.state, form.status, fetcher.data?.apiKey]);

  return (
    <>
      <Dialog open={createOpen} onOpenChange={createSetOpen}>
        <div>
          <DialogTrigger render={
            <Button variant="outline" type="button">+ Create API Key</Button>
          } />
        </div>
        <DialogContent>
          <FormControl form={form} as={fetcher.Form}>
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>
                Provide a brief description and expiration window.
              </DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Field name={fields.description.name}>
                <FieldLabel>Description</FieldLabel>
                <FieldControl render={
                  <Input placeholder="API key description" autoComplete="off" />
                  } />
                <FieldError />
              </Field>
              <Field name={fields.expiresIn.name}>
                <FieldLabel>Expires in</FieldLabel>
                <FieldControl render={
                  <Select
                    items={API_KEY_EXPIRATION_OPTIONS.map((option) => ({
                      value: option.value,
                      label: option.label,
                    }))}
                  />
                  } />
                <FieldError />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <DialogClose render={
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              } />
              <Button
                type="submit"
                name="intent"
                value="create"
                isLoading={fetcher.state !== "idle"}
              >
                Create
              </Button>
            </DialogFooter>
          </FormControl>
        </DialogContent>
      </Dialog>

      <ApiKeyRevealDialog
        open={revealOpen}
        onOpenChange={setRevealOpen}
        apiKey={fetcher.data?.apiKey?.value || ""}
      />
    </>
  );
}


type ApiKeyRevealDialogProps = {
  apiKey: string;
} & React.ComponentProps<typeof Dialog>;

function ApiKeyRevealDialog({ apiKey, ...props }: ApiKeyRevealDialogProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (props.open) setAcknowledged(false);
  }, [props.open]);

  return (
    <Dialog {...props}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="size-4" aria-hidden="true" />
            API Key
          </DialogTitle>
          <DialogDescription>
            Copy your key to a safe place, you won't be able to view it again.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Secret API Key
          </span>
          <Input readOnly copy value={apiKey} className="font-mono" />
        </div>

        <Alert>
          <AlertTitle>
            <Label htmlFor="acknowledge">
              <Checkbox
                id="acknowledge"
                type="checkbox"
                className="size-4 accent-foreground"
                value={acknowledged}
                onCheckedChange={setAcknowledged}
              />
              <span>I understand that I won't be able to view this key again</span>
            </Label>
          </AlertTitle>
        </Alert>

        <DialogFooter>
          <DialogClose render={
            <Button
              type="button"
              disabled={!acknowledged}
            >
              Close
            </Button>
          } />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
