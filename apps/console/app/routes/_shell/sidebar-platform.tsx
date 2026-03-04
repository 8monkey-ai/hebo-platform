import { Cloud, KeyRound } from "lucide-react";
import { Link, useLocation } from "react-router";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@hebo/shared-ui/components/Sidebar";

const navItems = [
  {
    label: "API Keys",
    icon: KeyRound,
    postfix: "/api-keys",
  },
  {
    label: "Providers",
    icon: Cloud,
    postfix: "/providers",
  },
] as const;

type SidebarPlatformProps = {
  activeAgent: { slug: string };
  activeBranch: { slug: string };
};

export const SidebarPlatform = ({ activeAgent, activeBranch }: SidebarPlatformProps) => {
  const { pathname } = useLocation();
  const basePath = `/agent/${activeAgent.slug}/branch/${activeBranch.slug}`;

  return (
    <SidebarMenu>
      {navItems.map(({ label, icon: Icon, postfix }) => {
        const path = `${basePath}${postfix}`;
        const active = pathname === path;

        return (
          <SidebarMenuItem
            key={label}
            className="transition-[margin] group-data-[state=expanded]:mx-0.5"
          >
            <SidebarMenuButton
              isActive={active}
              tooltip={label}
              render={
                <Link to={path} viewTransition>
                  <Icon aria-hidden="true" />
                  <span>{label}</span>
                </Link>
              }
            />
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
};
