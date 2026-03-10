import { Activity, BrainCog, Home } from "lucide-react";
import { Link, useLocation } from "react-router";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@hebo/shared-ui/components/Sidebar";

const navItems = [
  {
    label: "Overview",
    icon: Home,
    postfix: "",
  },
  {
    label: "Models",
    icon: BrainCog,
    postfix: "/models",
  },
  {
    label: "Traces",
    icon: Activity,
    postfix: "/traces",
  },
] as const;

type SidebarNavProps = {
  activeAgent: { slug: string };
  activeBranch: { slug: string };
};

export const SidebarNav = ({ activeAgent, activeBranch }: SidebarNavProps) => {
  const { pathname } = useLocation();
  const basePath = `/agent/${activeAgent.slug}/branch/${activeBranch.slug}`;

  return (
    <SidebarMenu>
      {navItems.map(({ label, icon: Icon, postfix }) => {
        const path = `${basePath}${postfix}`;
        const active = postfix ? pathname.startsWith(path) : pathname === path;

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
