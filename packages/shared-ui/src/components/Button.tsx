import { Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button as ShadCnButton } from "#/_shadcn/ui/button";
import { cn } from "#/lib/utils";

type ExtendedButtonProps = React.ComponentProps<typeof ShadCnButton> & {
  isLoading?: boolean;
};

export function Button({
  className,
  children,
  isLoading = false,
  disabled = false,
  ...props
}: ExtendedButtonProps) {
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(
      () => setShowSpinner(isLoading),
      isLoading ? 250 : 0,
    );

    return () => {
      clearTimeout(timeout);
    };
  }, [isLoading]);

  return (
    <ShadCnButton
      className={cn("px-3", className)}
      aria-busy={isLoading}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading && showSpinner && (
        <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden="true" />
      )}
      {/* FUTURE: Gerundify title, e.g. "Create" -> "Creating...." */}
      {children}
    </ShadCnButton>
  );
}
