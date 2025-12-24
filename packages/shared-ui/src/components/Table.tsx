import {
  Table as ShadCnTable,
  TableBody as ShadCnTableBody,
  TableHeader as ShadCnTableHeader,
} from "#/_shadcn/ui/table";
import { cn } from "#/lib/utils";

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <ShadCnTable
      className={cn(
        "rounded-lg overflow-hidden [&_td]:px-4 [&_th]:px-4",
        className,
      )}
      {...props}
    />
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <ShadCnTableHeader className={cn("bg-accent", className)} {...props} />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <ShadCnTableBody className={cn("bg-background", className)} {...props} />
  );
}

export { Table, TableHeader, TableBody };

export {
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "#/_shadcn/ui/table";
