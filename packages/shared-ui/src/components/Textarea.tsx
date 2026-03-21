import { Textarea as ShadCnTextarea } from "../_shadcn/ui/textarea";
import { cn } from "../lib/utils";

interface TextareaProps extends React.ComponentProps<"textarea"> {}

export function Textarea({ className, ...props }: TextareaProps) {
  return <ShadCnTextarea className={cn("bg-background text-sm", className)} {...props} />;
}
