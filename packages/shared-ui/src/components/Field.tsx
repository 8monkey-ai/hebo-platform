import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { useField } from "@conform-to/react";
import * as React from "react";

import {
  Field as ShadCnField,
  FieldLabel as ShadCnFieldLabel,
  FieldDescription as ShadCnFieldDescription,
  FieldError as ShadCnFieldError,
  FieldGroup as ShadCnFieldGroup,
} from "#/_shadcn/ui/field";
import { cn } from "#/lib/utils";

const FieldNameCtx = React.createContext<string | undefined>(undefined);
const useF = () => {
  const fn = React.useContext(FieldNameCtx);
  const f = useField(fn ?? "")[0];
  if (fn) return f;
  console.warn(
    "Use <FieldLabel/FieldDescription/FieldMessage> inside <Field>.",
  );
};

function Field({
  name = "dummy",
  orientation,
  className,
  ...props
}: React.ComponentProps<typeof ShadCnField> & {
  name: string;
}) {
  return (
    <FieldNameCtx.Provider value={name}>
      <ShadCnField
        className={cn(
          "gap-2 @md/field-group:[&>[data-slot=field-label]]:flex-initial @md/field-group:[&>[data-slot=field-label]]:min-w-32",
          (orientation === "horizontal" || orientation === "responsive") &&
            "@md/field-group:[&>[data-slot=field-label]]:mt-2",
          className,
        )}
        orientation={orientation}
        {...props}
      />
    </FieldNameCtx.Provider>
  );
}

function FieldLabel({
  ...props
}: React.ComponentProps<typeof ShadCnFieldLabel>) {
  const field = useF();

  return (
    <ShadCnFieldLabel
      data-error={!field?.valid}
      htmlFor={field?.id}
      {...props}
    />
  );
}

function FieldDescription({
  ...props
}: React.ComponentProps<typeof ShadCnFieldDescription>) {
  const field = useF();

  return <ShadCnFieldDescription id={field?.descriptionId} {...props} />;
}

function FieldError() {
  const field = useF();
  const errorsDict = field?.errors?.map((message) => ({ message }));

  return <ShadCnFieldError id={field?.errorId} errors={errorsDict} />;
}

function FieldGroup({
  className,
  ...props
}: React.ComponentProps<typeof ShadCnFieldGroup>) {
  return <ShadCnFieldGroup className={cn("gap-4", className)} {...props} />;
}

function FieldControl({ render, ...props }: useRender.ComponentProps<"input">) {
  const field = useF();

  return useRender({
    defaultTagName: "input",
    props: mergeProps<"input">(
      {
        id: field?.id,
        name: field?.name,
        defaultValue: (field?.initialValue as string) ?? "",
        "aria-describedby": field?.valid
          ? `${field?.descriptionId}`
          : `${field?.errorId}`,
        "aria-invalid": !field?.valid,
      },
      props,
    ),
    render,
  });
}

export {
  Field,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldGroup,
};

export {
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldContent,
  FieldTitle,
} from "#/_shadcn/ui/field";
