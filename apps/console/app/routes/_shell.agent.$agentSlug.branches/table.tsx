import { useState } from "react";
import { MoreVertical, Trash } from "lucide-react";

import { Badge } from "@hebo/shared-ui/components/Badge";
import { Button } from "@hebo/shared-ui/components/Button";
import { CopyButton } from "@hebo/shared-ui/components/CopyButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@hebo/shared-ui/components/DropdownMenu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hebo/shared-ui/components/Table";

import DeleteBranchDialog from "./delete";
import { formatDateTime } from "~console/lib/utils";


type BranchesTableProps = {
  agent: {
    slug: string,
    branches?: {
      slug: string,
      updated_by?: string,
      updated_at?: Date,
    }[];
  };
};

export default function BranchesTable({ agent }: BranchesTableProps) {
  const [deleteDialog, setDeleteDialog] = useState({ open: false, branchSlug: ""});

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/3">Branch</TableHead>
            <TableHead className="hidden sm:table-cell">Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agent.branches!.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                No branches yet.
              </TableCell>
            </TableRow>
          ) : (
            agent.branches!.map((branch) => {
              const copyValue = `${agent.slug}/${branch.slug}`;
              return (
                <TableRow key={branch.slug}>
                  <TableCell className="align-middle">
                    <div className="flex items-center gap-1">
                      <Badge variant="outline">
                        <span className="text-ellipsis-start">
                          {branch.slug}
                        </span>
                      </Badge>
                      <CopyButton value={copyValue} />
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {`${branch.updated_by ?? "Dummy User"} (${formatDateTime(branch.updated_at ?? new Date(0))})`}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={
                        <Button variant="ghost" size="icon" aria-label="Branch actions">
                          <MoreVertical className="size-4" aria-hidden="true" />
                        </Button>
                      } />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setDeleteDialog({ open: true, branchSlug: branch.slug })
                          }}
                        >
                          <Trash aria-hidden="true" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <DeleteBranchDialog
        {...deleteDialog}
        onOpenChange={(open: boolean) => {
          if (!open) setDeleteDialog({ open: false, branchSlug: ""});
        }}
      />
    </div>
  );
}
