import { ComboboxInput as ShadcnComboboxInput } from "../_shadcn/ui/combobox";
import { cn } from "../lib/utils";

export function ComboboxInput({
  className,
  ...props
}: React.ComponentProps<typeof ShadcnComboboxInput>) {
  return <ShadcnComboboxInput className={cn("bg-background", className)} {...props} />;
}

export {
  Combobox,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxValue,
} from "../_shadcn/ui/combobox";
