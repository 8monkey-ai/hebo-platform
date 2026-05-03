import { Activity, BrainCog, Home, KeyRound, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { useSnapshot } from "valtio";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@hebo/shared-ui/components/Sidebar";

import { authService } from "~console/lib/auth";
import { shellStore } from "~console/lib/shell";

const NAV_ITEMS = [
  { label: "Overview", icon: Home, postfix: "", role: "any" as const },
  { label: "Presets", icon: BrainCog, postfix: "/presets", role: "any" as const },
  { label: "API Keys", icon: KeyRound, postfix: "/api-keys", role: "owner-admin" as const },
  { label: "Traces", icon: Activity, postfix: "/traces", role: "any" as const },
  { label: "Settings", icon: Settings, postfix: "/settings", role: "any" as const },
] as const;

type SidebarNavProps = {
  activeWorkspace: { slug: string };
};

export const SidebarNav = ({ activeWorkspace }: SidebarNavProps) => {
  const { pathname } = useLocation();
  const { user } = useSnapshot(shellStore);
  const [role, setRole] = useState<string | undefined>();

  useEffect(() => {
    if (!user) return;
    void authService.getOrganization().then(({ members }) => {
      setRole(members.find((m) => m.userId === user.userId)?.role);
      return null;
    });
  }, [user]);

  const canManage = role === "owner" || role === "admin";
  const basePath = `/w/${activeWorkspace.slug}`;

  return (
    <SidebarMenu>
      {NAV_ITEMS.filter((item) => item.role === "any" || canManage).map(
        ({ label, icon: Icon, postfix }) => {
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
        },
      )}
    </SidebarMenu>
  );
};
