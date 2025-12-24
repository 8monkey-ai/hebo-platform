import { Check, ChevronsUpDown, Plus, Settings } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
          <DropdownMenuTrigger render={
            <SidebarMenuButton size="lg" aria-label="Select agent">
              <AgentLogo />
              <span className="truncate text-lg font-medium">
                {activeAgent?.name ?? "hebo.ai"}
              </span>
              <ChevronsUpDown className="ml-auto" aria-hidden="true" />
            </SidebarMenuButton>
            } />
          <DropdownMenuContent
            className="min-w-52"
            align="start"
            side="bottom"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <div className="flex items-center justify-between py-1">
                <DropdownMenuLabel className="flex items-center gap-2 text-foreground">
                  <AgentLogo size={24} />
                  <div className="grid flex-1">
                    <span className="truncate text-base font-medium">
                      {activeAgent?.name ?? "hebo.ai"}
                    </span>
                  </div>
                </DropdownMenuLabel>
                {activeAgent && (
                  <DropdownMenuItem className="p-2" render={
                    <Link
                      to={`/agent/${activeAgent.slug}/settings`}
                      viewTransition
                      aria-label="Agent Settings"
                    >
                      <Settings
                        size={16}
                        className="ml-auto"
                        aria-hidden="true"
                      />
                    </Link>
                  } />
                )}
              </div>
              <DropdownMenuSeparator />
              {agents.length > 0 ? (
                agents.map((agent) => (
                  <DropdownMenuItem key={agent.slug} className="gap-2 p-2" render={
                    <Link to={`/agent/${agent.slug}/branch/main`} viewTransition>
                      <span className="truncate">{agent.name}</span>
                      {agent.slug === activeAgent?.slug && (
                        <Check size={12} className="ml-auto" aria-hidden="true" />
                      )}
                    </Link>
                  } /> 
                ))
              ) : (
                <DropdownMenuItem disabled className="gap-2 p-2 text-muted-foreground">
                  No Agents
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 p-2" render={
                <Link to="/agent/create" aria-label="Create agent" viewTransition>
                  <Plus className="size-4" aria-hidden="true" />
                  <span className="text-muted-foreground font-medium">
                    Create Agent
                  </span>
                </Link>
              } />
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
