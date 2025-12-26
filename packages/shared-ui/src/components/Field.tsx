import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { FormProvider, type FormMetadata, useField } from "@conform-to/react";
import * as React from "react";

import {
  Field as ShadCnField,
  FieldLabel as ShadCnFieldLabel,
  FieldDescription as ShadCnFieldDescription,
  FieldError as ShadCnFieldError,
  FieldGroup as ShadCnFieldGroup,
} from "#/_shadcn/ui/field";
import { cn } from "#/lib/utils";

const FieldCtx = React.createContext<
  ReturnType<typeof useField>[0] | undefined
>(undefined);

const useF = () => {
  const field = React.useContext(FieldCtx);

  if (!field) {
    console.warn("Pass the `form` prop to <Field> to provide Conform context.");
  }

  return field;
};

function Field({
  name,
  context,
  orientation,
  className,
  ...props
}: React.ComponentProps<typeof ShadCnField> & {
  name?: string;
  context: FormMetadata<any, any>["context"];
}) {
  return (
    <FormProvider context={context}>
      <FieldWithContext
        name={name}
        orientation={orientation}
        className={className}
        {...props}
      />
    </FormProvider>
  );
}

function FieldWithContext({
  name,
  orientation,
  className,
  ...props
}: React.ComponentProps<typeof ShadCnField> & { name?: string }) {
  const [field] = useField(name || "");

  return (
    <FieldCtx.Provider value={name ? field : undefined}>
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
    </FieldCtx.Provider>
  );
}

function FieldLabel({
  ...props
}: React.ComponentProps<typeof ShadCnFieldLabel>) {
  const field = useF();

  return (
    <ShadCnFieldLabel
      data-error={field ? !field.valid : undefined}
      htmlFor={field?.id ?? props.htmlFor}
      {...props}
    />
  );
}

function FieldDescription({
  ...props
}: React.ComponentProps<typeof ShadCnFieldDescription>) {
  const field = useF();

  return (
    <ShadCnFieldDescription id={field?.descriptionId ?? props.id} {...props} />
  );
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

  const controlProps: React.ComponentProps<"input"> = {
    id: field?.id,
    name: field?.name,
  };

  if (field) {
    controlProps.defaultValue = (field.initialValue as string) ?? "";
    controlProps["aria-describedby"] = field.valid
      ? field.descriptionId
      : field.errorId;
    controlProps["aria-invalid"] = !field.valid;
  }

  return useRender({
    defaultTagName: "input",
    props: mergeProps<"input">(controlProps, props),
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
