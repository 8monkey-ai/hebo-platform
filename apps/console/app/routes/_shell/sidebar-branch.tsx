import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@hebo/shared-ui/components/DropdownMenu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@hebo/shared-ui/components/Sidebar";

type Workspace = {
  name: string;
  slug: string;
};

export function WorkspaceSelect({
  activeWorkspace,
  workspaces,
}: {
  activeWorkspace: Workspace | undefined;
  workspaces: Workspace[];
}) {
  const [selectorOpen, setSelectorOpen] = useState(false);

  return (
    <SidebarMenu>
      <SidebarMenuItem className="transition-[margin] group-data-[state=expanded]:mx-1.5">
        <DropdownMenu open={selectorOpen} onOpenChange={setSelectorOpen}>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                className="border border-input bg-background"
                aria-label="Select workspace"
              >
                <span className="truncate">
                  {activeWorkspace?.name ?? (
                    <span className="text-muted-foreground">Select workspace …</span>
                  )}
                </span>
                <ChevronsUpDown className="ml-auto" aria-hidden="true" />
              </SidebarMenuButton>
            }
          />
          <DropdownMenuContent className="min-w-52" align="start" side="bottom" sideOffset={4}>
            <DropdownMenuGroup>
              {workspaces.length > 0 ? (
                workspaces.map((workspace) => (
                  <DropdownMenuItem
                    key={workspace.slug}
                    className="gap-2 p-2"
                    render={
                      <Link to={`/w/${workspace.slug}`} viewTransition>
                        <span className="truncate">{workspace.name}</span>
                        {workspace.slug === activeWorkspace?.slug && (
                          <Check size={12} className="ml-auto" aria-hidden="true" />
                        )}
                      </Link>
                    }
                  />
                ))
              ) : (
                <DropdownMenuItem disabled className="gap-2 p-2 text-muted-foreground">
                  No workspaces
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 p-2"
                render={
                  <Link to="/w/create" aria-label="Create workspace" viewTransition>
                    <Plus className="size-4 text-muted-foreground" aria-hidden="true" />
                    <span className="font-medium text-muted-foreground">New Workspace</span>
                  </Link>
                }
              />
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
