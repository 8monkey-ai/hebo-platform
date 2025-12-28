import { useRender } from "@base-ui/react";
import { mergeProps } from "@base-ui/react/merge-props";
import {
  FormMetadata,
  FormProvider,
  getFormProps,
  useField,
} from "@conform-to/react";
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

  if (!field)
    console.warn(
      'Wrap your component into <Field name="..."> to provide Conform context.',
    );

  return field;
};

function Field({
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

  const errors = field?.errors;
  const errorsDict = Array.isArray(errors)
    ? errors.map((message) => ({ message }))
    : undefined;

  return <ShadCnFieldError id={field?.errorId} errors={errorsDict} />;
}

function FieldGroup({
  className,
  ...props
}: React.ComponentProps<typeof ShadCnFieldGroup>) {
  return <ShadCnFieldGroup className={cn("gap-4", className)} {...props} />;
}

type FieldControlProps = React.ComponentProps<"input"> & {
  children?: React.ReactElement;
};

function FieldControl({ children, ...props }: FieldControlProps) {
  const field = useF();

  const controlProps: React.ComponentProps<"input"> = {
    id: field?.id,
    name: field?.name,
  };

  if (field) {
    controlProps.defaultValue =
      (field.initialValue as string | number | string[]) ?? "";
    controlProps["aria-describedby"] = field.valid
      ? field.descriptionId
      : field.errorId;
    controlProps["aria-invalid"] = !field.valid;
  }

  return useRender({
    defaultTagName: "input",
    props: mergeProps<"input">(controlProps, props),
    render: children,
  });
}

type FormControlProps = {
  form: FormMetadata<any, any>;
  as: React.ElementType;
} & React.ComponentProps<"form">;

export function FormControl({
  form,
  as,
  children,
  ...props
}: FormControlProps) {
  const Comp = as;

  return (
    <FormProvider context={form.context}>
      <Comp
        method="post"
        className="contents"
        {...getFormProps(form)}
        {...props}
      >
        {children}
      </Comp>
    </FormProvider>
  );
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
