import { Alert as ShadCnAlert } from "#/_shadcn/ui/alert";
import { cn } from "#/lib/utils";

export function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<typeof ShadCnAlert>) {
  return (
    <ShadCnAlert
      data-slot="alert"
      role="alert"
      variant={variant}
      className={cn("bg-muted/50", className)}
      {...props}
    />
  );
}

export { AlertTitle, AlertDescription } from "#/_shadcn/ui/alert";
