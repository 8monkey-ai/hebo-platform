import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { type FieldMetadata } from "@conform-to/react";
import * as React from "react";

import { Label } from "#/_shadcn/ui/label";
import { cn } from "#/lib/utils";

const FieldCtx = React.createContext<FieldMetadata<string> | undefined>(
  undefined,
);
const useField = () => {
  const f = React.useContext(FieldCtx);
  if (!f)
    throw new Error(
      "Use <FormLabel/FormControl/FormDescription/FormMessage> inside <FormField>.",
    );
  return f;
};

function FormField({
  field,
  children,
  className,
}: {
  field: FieldMetadata<string>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <FieldCtx.Provider value={field}>
      <div className={cn(className)}>{children}</div>
    </FieldCtx.Provider>
  );
}

function FormLabel({ className, ...props }: React.ComponentProps<"label">) {
  const { id, valid } = useField();

  return (
    <Label
      data-slot="form-label"
      data-error={!valid}
      className={cn("data-[error=true]:text-destructive py-1.5", className)}
      htmlFor={id}
      {...props}
    />
  );
}

function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
  const { descriptionId } = useField();

  return (
    <p
      data-slot="form-description"
      id={descriptionId}
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function FormMessage({ className, ...props }: React.ComponentProps<"p">) {
  const { errorId, errors } = useField();

  if (!errors?.length) return <></>;

  return (
    <p
      data-slot="form-message"
      id={errorId}
      role="alert"
      className={cn("text-destructive text-sm whitespace-pre-line", className)}
      {...props}
    >
      {errors.join("\n")}
    </p>
  );
}

function FormControl({
  render,
  children,
  ...props
}: useRender.ComponentProps<"input"> &
  Omit<React.ComponentProps<"input">, "children"> & {
    children?: React.ReactNode;
  }) {
  const { descriptionId, errorId, id, initialValue, name, valid } = useField();

  return useRender({
    defaultTagName: "input",
    props: mergeProps<"input">(
      {
        id,
        name,
        defaultValue: initialValue,
        "aria-describedby": valid ? `${descriptionId}` : `${errorId}`,
        "aria-invalid": !valid,
      },
      props,
    ),
    render:
      render ??
      (children
        ? (renderProps) =>
            React.isValidElement(children) ? (
              React.cloneElement(children, renderProps)
            ) : (
              <>children needs to be a valid React element</>
            )
        : undefined),
  });
}

export { FormControl, FormField, FormLabel, FormDescription, FormMessage };
