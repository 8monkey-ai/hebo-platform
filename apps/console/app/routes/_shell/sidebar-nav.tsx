import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@hebo/shared-ui/components/Sidebar";
import { BrainCog, Home } from "lucide-react";
import { Link, useLocation } from "react-router";

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
        const active = pathname === path;

        return (
          <SidebarMenuItem key={label} className="group-data-[state=expanded]:mx-0.5 transition-[margin]">
            <SidebarMenuButton 
              asChild 
              isActive={active}
              tooltip={label}
              >
              <Link to={path} viewTransition>
                <Icon aria-hidden="true" />
                {label}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
};
