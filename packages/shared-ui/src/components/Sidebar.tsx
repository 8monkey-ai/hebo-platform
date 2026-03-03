import { PanelLeftIcon } from "lucide-react";

import { Button } from "#/_shadcn/ui/button";
import { useSidebar } from "#/_shadcn/ui/sidebar";
import { cn } from "#/lib/utils";

export function SidebarTrigger({
  className,
  onClick,
  icon = <PanelLeftIcon />,
  ...props
}: React.ComponentProps<typeof Button> & {
  icon?: React.ReactNode;
}) {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon"
      className={cn("size-7 z-20 hover:bg-sidebar-accent", className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      {icon}
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "#/_shadcn/ui/sidebar";
