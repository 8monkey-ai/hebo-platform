import { BookOpen, ChevronsUpDown, ExternalLink, Keyboard, LogOut } from "lucide-react";
import { Link } from "react-router";

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
import { kbs } from "~console/lib/utils";
import { KeyboardShortcuts } from "./shortcuts";
import { useState } from "react";


type User = {
  name: string,
  email: string,
  initials?: string,
  avatar?: string
}

export function UserMenu({ user }: { user?: User}) {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  return (
    <SidebarMenu>
      <SidebarMenuItem className="group-data-[state=collapsed]:my-2 transition-[margin]">
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <SidebarMenuButton size="lg">
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user?.avatar} alt={user?.name} />
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
          } />
          <DropdownMenuContent
            className="m-2 w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side="bottom"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal text-foreground">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user?.avatar} alt={user?.name} />
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
              <DropdownMenuSeparator />
              <DropdownMenuItem render={
                <a
                    href="https://hebo.ai/docs"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                  <BookOpen />
                  <span>Documentation</span>
                  <DropdownMenuShortcut><ExternalLink /></DropdownMenuShortcut>
                </a>
              } />
              <DropdownMenuItem onClick={() => setShortcutsOpen(true)}>
                <Keyboard />
                Shortcuts
                <DropdownMenuShortcut>{kbs("mod+/")}</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={
                <Link to="/handler/sign-out" viewTransition>
                  <LogOut aria-hidden="true" />
                  <span>Log out</span>
                </Link>
              } />
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <KeyboardShortcuts open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
