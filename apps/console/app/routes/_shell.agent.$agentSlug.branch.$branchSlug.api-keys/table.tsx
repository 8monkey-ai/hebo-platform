import { useState } from "react";

import { Badge } from "@hebo/shared-ui/components/Badge";
import { Button } from "@hebo/shared-ui/components/Button";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@hebo/shared-ui/components/Tooltip";
import { MoreVertical } from "lucide-react";

import type { ApiKey } from "~console/lib/auth/types";

import { RevokeApiKeyDialog } from "./revoke";
import { formatDateTime } from "~console/lib/utils";


export function ApiKeysTable({ apiKeys }: { apiKeys: ApiKey[] }) {
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<ApiKey | undefined>(undefined);

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Key</TableHead>
            <TableHead>Created</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {apiKeys.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center text-muted-foreground"
              >
                No API keys yet.
              </TableCell>
            </TableRow>
          ) : (
            apiKeys.map((key) => {
              const isExpired = key.expiresAt.getTime() <= Date.now();
              const isExpiringSoon = !isExpired && key.expiresAt.getTime() - Date.now() <= 7 * 24 * 60 * 60 * 1000; // 7 Days

              return (
                <TableRow key={key.id}>
                  <TableCell>{key.name || "—"}</TableCell>
                  <TableCell className="align-middle">
                    <Tooltip>
                      <TooltipTrigger render={
                        <Badge
                          variant="outline"
                          className={isExpired ? "border-destructive text-destructive"
                            : isExpiringSoon
                              ? "border-amber-600 text-amber-600"
                              : "border-emerald-600 text-emerald-600"}
                        >
                          {isExpired? "Expired" : isExpiringSoon? "Expires Soon": "Active"}
                        </Badge>
                      } />
                      <TooltipContent>
                        {isExpired ? "Expired " : "Expires "}
                        {formatDateTime(key.expiresAt)}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 font-mono text-sm">
                      <span className="truncate">{key.key}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(key.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="API key actions"
                        >
                          <MoreVertical className="size-4" aria-hidden="true" />
                        </Button>
                      } />
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setSelectedKey(key);
                            setRevokeOpen(true);
                          }}
                        >
                          Revoke
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

      <RevokeApiKeyDialog
        open={revokeOpen}
        apiKey={selectedKey}
        onOpenChange={(open) => {
          setRevokeOpen(open);
          if (!open) setSelectedKey(undefined);
        }}
      />
    </div>
  );
}
