import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@hebo/shared-ui/components/Sidebar";
import { BrainCog, Home, KeyRound } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";
import { useHotkeys } from "react-hotkeys-hook";
import { kbs } from "~console/lib/utils";

const navItems = [
  {
    label: "Overview",
    icon: Home,
    postfix: "",
    shortcut: undefined,
  },
  {
    label: "Models",
    icon: BrainCog,
    postfix: "/models",
    shortcut: undefined,
  },
  {
    label: "API Keys",
    icon: KeyRound,
    postfix: "/api-keys",
    shortcut: undefined,
  },
] as const;

type SidebarNavProps = {
  activeAgent: { slug: string };
  activeBranch: { slug: string };
};

export const SidebarNav = ({ activeAgent, activeBranch }: SidebarNavProps) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const basePath = `/agent/${activeAgent.slug}/branch/${activeBranch.slug}`;

  navItems.filter((i) => i.shortcut).forEach((item) => {
    useHotkeys(
      item.shortcut ?? "",
      () => {
        navigate(`${basePath}${item.postfix}`, { viewTransition: true });
      },
      { preventDefault: true },
      [activeAgent.slug, activeBranch.slug, basePath, navigate],
    );
  });

  return (
    <SidebarMenu>
      {navItems.map(({ label, icon: Icon, postfix, shortcut }) => {
        const path = `${basePath}${postfix}`;
        const active = pathname === path;

        return (
          <SidebarMenuItem key={label} className="group-data-[state=expanded]:mx-0.5 transition-[margin]">
            <SidebarMenuButton 
              asChild 
              isActive={active}
              tooltip={{
                children: (
                  <span>
                    {label}{" "}
                    {shortcut && 
                      <span className="text-muted-foreground">
                        ({kbs(shortcut)})
                      </span>
                    }
                  </span>
                )
              }}
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
