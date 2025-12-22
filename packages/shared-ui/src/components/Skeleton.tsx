import { Table, TableBody, TableCell, TableHeader, TableRow } from "./Table";
import { Skeleton as ShadCnSkeleton } from "../_shadcn/ui/skeleton";

interface SkeletonProps extends React.ComponentProps<"div"> {
  count?: number;
}

export function Skeleton({ count = 1, className, ...props }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <ShadCnSkeleton key={i} className={className} {...props} />
      ))}
    </>
  );
}

export function TableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableCell className="h-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 4 }).map((_, index) => (
          <TableRow key={index}>
            <TableCell className="h-13">
              <Skeleton className="h-5" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
