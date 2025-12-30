import { Check, ChevronDown, GitBranch } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@hebo/shared-ui/components/DropdownMenu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@hebo/shared-ui/components/Sidebar";


type Branch = {
  slug: string;
  name: string;
};

type Agent = {
  slug: string;
  branches?: Branch[];
};

export function BranchSelect({
  activeAgent,
  activeBranch,
}: {
  activeAgent: Agent;
  activeBranch?: Branch;
}) {

  const branches = activeAgent.branches ?? [];

  const [selectorOpen, setSelectorOpen] = useState(false);

  return (
    <SidebarMenu>
      <SidebarMenuItem className="group-data-[state=expanded]:mx-1.5 transition-[margin]">
        <DropdownMenu open={selectorOpen} onOpenChange={setSelectorOpen}>
          <DropdownMenuTrigger render={
            <SidebarMenuButton className="bg-background border-input border" aria-label="Select branch">
              <GitBranch aria-hidden="true" />
              <span className="truncate">
                  {activeBranch?.name ?? <span className="text-muted-foreground">Select …</span>}
              </span>
              <ChevronDown className="ml-auto" aria-hidden="true" />
            </SidebarMenuButton>
          } />
          <DropdownMenuContent
            className="min-w-42"
            align="start"
            side="bottom"
            sideOffset={4}
          >
            {branches.length > 0 ? (
              branches.map((branch) => (
                <DropdownMenuItem key={branch.slug} render={
                  <Link
                    to={`/agent/${activeAgent.slug}/branch/${branch.slug}`}
                    viewTransition
                  >
                    <span className="truncate">{branch.name}</span>
                    {branch.slug === activeBranch?.slug && (
                      <Check size={12} className="ml-auto" aria-hidden="true" />
                    )}
                  </Link>
                } />
              ))
            ) : (
              <DropdownMenuItem
                disabled
                className="text-muted-foreground"
              >
                No branches
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-muted-foreground" render={
              <Link
                  to={`/agent/${activeAgent.slug}/branches`}
                  viewTransition
                >
                Manage branches
              </Link>
            } />
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
