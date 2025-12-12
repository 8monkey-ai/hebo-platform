import { BookOpen, ChevronsUpDown, ExternalLink, Keyboard, LogOut } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@hebo/shared-ui/components/Avatar";
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
import { useNavigate } from "react-router";
import { authService } from "~console/lib/auth";
import { kbs } from "~console/lib/utils";
import { KeyboardShortcuts } from "./shortcuts";
import { useState } from "react";
import type { User } from "~console/lib/auth/types";

export function UserMenu({ user }: { user?: User }) {
  const navigate = useNavigate();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async (event: Event) => {
    event.preventDefault();
    if (isSigningOut) return;

    setIsSigningOut(true);
    try {
      await authService.signOut();
      navigate("/signin", { replace: true, viewTransition: true });
    } catch (error) {
      console.error("Sign out failed", error);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem className="group-data-[state=collapsed]:my-2 transition-[margin]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg">
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user?.image} alt={user?.name} />
                <AvatarFallback className="rounded-lg">
                  {user?.initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user?.name}</span>
                <span className="truncate text-xs">{user?.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" aria-hidden="true" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="m-2 w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side="bottom"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user?.image} alt={user?.name} />
                  <AvatarFallback className="rounded-lg">
                    {user?.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user?.name}</span>
                  <span className="truncate text-xs">{user?.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a
                  href="https://docs.hebo.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <BookOpen />
                  Documentation
                  <DropdownMenuShortcut><ExternalLink /></DropdownMenuShortcut>
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setShortcutsOpen(true)}>
                <Keyboard />
                Shortcuts
                <DropdownMenuShortcut>{kbs("mod+/")}</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={isSigningOut}
                onSelect={handleSignOut}
              >
                <LogOut aria-hidden="true" />
                {isSigningOut ? "Logging out..." : "Log out"}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <KeyboardShortcuts open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
