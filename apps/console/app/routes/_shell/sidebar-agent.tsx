import { Check, ChevronsUpDown, Plus, Settings } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@hebo/shared-ui/components/DropdownMenu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@hebo/shared-ui/components/Sidebar";

import { AgentLogo } from "~console/components/ui/AgentLogo";

type Agent = {
  name: string,
  slug: string,
}

export function AgentSelect({
  activeAgent,
  agents,
}: {
  activeAgent: Agent | undefined,
  agents: Agent[],
}) {

  const [selectorOpen, setSelectorOpen] = useState(false);

  return (
    <SidebarMenu>
      <SidebarMenuItem className="group-data-[state=collapsed]:my-2 transition-[margin]">
        <DropdownMenu open={selectorOpen} onOpenChange={setSelectorOpen}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" aria-label="Select agent">
              <AgentLogo />
              <span className="truncate text-lg font-medium">
                {activeAgent?.name ?? "hebo.ai"}
              </span>
              <ChevronsUpDown className="ml-auto" aria-hidden="true" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side="bottom"
            sideOffset={4}
          >
            <div className="flex items-center justify-between py-1">
              <DropdownMenuLabel className="font-normal pr-0">
                <div className="flex items-center gap-2">
                  <div className="aspect-square size-6 rounded-lg">
                    <AgentLogo size={24} />
                  </div>
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="truncate text-base font-medium">
                      {activeAgent?.name ?? "hebo.ai"}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              {activeAgent && (
                <DropdownMenuItem asChild className="p-2">
                  <Link
                    to={`/agent/${activeAgent.slug}/settings`}
                    viewTransition
                    aria-label="Agent Settings"
                  >
                    <Settings
                      size={16}
                      className="ml-auto "
                      aria-hidden="true"
                    />
                  </Link>
                </DropdownMenuItem>
              )}
            </div>
            <DropdownMenuSeparator />
            {agents.length > 0 ? (
              agents.map((agent) => (
                <DropdownMenuItem key={agent.slug} className="gap-2 p-2" asChild>
                  <Link to={`/agent/${agent.slug}/branch/main`} viewTransition>
                    <span className="truncate">{agent.name}</span>
                    {agent.slug === activeAgent?.slug && (
                      <Check size={12} className="ml-auto" aria-hidden="true" />
                    )}
                  </Link>
                </DropdownMenuItem>
              ))
            ) : (
              <DropdownMenuItem disabled className="gap-2 p-2 text-muted-foreground">
                No Agents
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="gap-2 p-2">
              <Link to="/agent/create" aria-label="Create agent" viewTransition>
                <Plus className="size-4" aria-hidden="true" />
                <div className="text-muted-foreground font-medium">
                  Create Agent
                </div>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
