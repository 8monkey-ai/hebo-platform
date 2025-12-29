import {
  SelectTrigger,
  Select as ShadCnSelect,
  SelectValue,
  SelectContent,
  SelectItem,
} from "#/_shadcn/ui/select";

type SelectProps = React.ComponentProps<typeof ShadCnSelect> & {
  items: Array<{ value: string; label: React.ReactNode }>;
  placeholder?: string;
};

function Select({ items, placeholder, ...props }: SelectProps) {
  return (
    <ShadCnSelect {...props}>
      <SelectTrigger className="bg-background w-full min-w-0 truncate">
        <SelectValue>
          {(value) =>
            items.find((item) => item.value === value)?.label ?? (
              <span className="text-muted-foreground">{placeholder}</span>
            )
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => {
          return (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </ShadCnSelect>
  );
}

export { Select };
