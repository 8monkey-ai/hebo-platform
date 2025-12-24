import { type Dialog as DialogPrimitive } from "@base-ui/react/dialog";

import { DialogTitle as ShadCnDialogTitle } from "#/_shadcn/ui/dialog";
import { cn } from "#/lib/utils";

export function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <ShadCnDialogTitle className={cn("font-medium", className)} {...props} />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTrigger,
} from "#/_shadcn/ui/dialog";
