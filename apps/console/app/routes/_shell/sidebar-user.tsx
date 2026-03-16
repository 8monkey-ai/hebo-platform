import {
  BookOpen,
  Building2,
  Check,
  ChevronsUpDown,
  ExternalLink,
  Keyboard,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { Avatar, AvatarFallback, AvatarImage } from "@hebo/shared-ui/components/Avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@hebo/shared-ui/components/DropdownMenu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@hebo/shared-ui/components/Sidebar";

import { authService } from "~console/lib/auth";
import type { Organization, User } from "~console/lib/auth/types";
import { kbs } from "~console/lib/utils";

import { KeyboardShortcuts } from "./shortcuts";

export function UserMenu({ user, organizations }: { user?: User; organizations: Organization[] }) {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const activeOrg = organizations.find((o) => o.id === user?.organizationId);
  const otherOrgs = organizations.filter((o) => o.id !== user?.organizationId);

  return (
    <SidebarMenu>
      <SidebarMenuItem className="transition-[margin] group-data-[state=collapsed]:my-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg">
                <Avatar>
                  <AvatarImage src={user?.image} alt={user?.name} />
                  <AvatarFallback>{user?.initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-sm leading-tight">
                  <span className="truncate font-medium">{user?.name}</span>
                  <span className="truncate text-xs">{user?.email}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" aria-hidden="true" />
              </SidebarMenuButton>
            }
          />
          <DropdownMenuContent className="min-w-56" side="bottom" align="end" sideOffset={4}>
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex items-center gap-2 px-1 py-1.5 text-left text-sm font-normal text-foreground">
                <Avatar>
                  <AvatarImage src={user?.image} alt={user?.name} />
                  <AvatarFallback>{user?.initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-sm leading-tight">
                  <span className="truncate font-medium">{user?.name}</span>
                  <span className="truncate text-xs">{user?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                render={
                  <a href="https://hebo.ai/docs" target="_blank" rel="noopener">
                    <BookOpen />
                    <span>Documentation</span>
                    <DropdownMenuShortcut>
                      <ExternalLink />
                    </DropdownMenuShortcut>
                  </a>
                }
              />
              <DropdownMenuItem onClick={() => setShortcutsOpen(true)}>
                <Keyboard />
                <span>Shortcuts</span>
                <DropdownMenuShortcut>{kbs("mod+/")}</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </DropdownMenuGroup>

            {organizations.length > 1 && (
              <DropdownMenuGroup>
                <DropdownMenuLabel className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Building2 size={12} />
                  Oganization
                </DropdownMenuLabel>
                {activeOrg && (
                  <DropdownMenuItem className="gap-2 p-2" disabled>
                    <span className="truncate">{activeOrg.name}</span>
                    <Check size={12} className="ml-auto" aria-hidden="true" />
                  </DropdownMenuItem>
                )}
                {otherOrgs.map((org) => (
                  <DropdownMenuItem
                    key={org.id}
                    className="gap-2 p-2"
                    onSelect={() => authService.setActiveOrganization(org.id)}
                  >
                    <span className="truncate">{org.name}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </DropdownMenuGroup>
            )}

            <DropdownMenuGroup>
              <DropdownMenuItem
                render={
                  <Link to="/signout" viewTransition>
                    <LogOut aria-hidden="true" />
                    <span>Log out</span>
                  </Link>
                }
              />
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <KeyboardShortcuts open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
