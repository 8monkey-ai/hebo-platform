import { Cloud } from "lucide-react";
import { Link, useLocation } from "react-router";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@hebo/shared-ui/components/Sidebar";

const navItems = [
  {
    label: "Providers",
    icon: Cloud,
    postfix: "/providers",
  },
] as const;

type SidebarPlatformProps = {
  activeWorkspace: { slug: string };
};

export const SidebarPlatform = ({ activeWorkspace }: SidebarPlatformProps) => {
  const { pathname } = useLocation();
  const basePath = `/w/${activeWorkspace.slug}`;

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
