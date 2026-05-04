import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@hebo/shared-ui/components/Sidebar";

import { AgentLogo } from "~console/components/ui/AgentLogo";

export function HeboWordmark() {
  return (
    <SidebarMenu>
      <SidebarMenuItem className="transition-[margin] group-data-[state=collapsed]:my-2">
        <SidebarMenuButton
          size="lg"
          className="pointer-events-none cursor-default"
          aria-label="hebo.ai"
        >
          <AgentLogo />
          <span className="truncate text-lg font-medium">hebo.ai</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
