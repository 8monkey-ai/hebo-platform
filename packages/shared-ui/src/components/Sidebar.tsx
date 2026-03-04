import { PanelLeftIcon } from "lucide-react";

import { Button } from "#/_shadcn/ui/button";
import { useSidebar, Sidebar as ShadCnSidebar } from "#/_shadcn/ui/sidebar";
import { cn } from "#/lib/utils";

export function Sidebar({
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  side?: "left" | "right";
  variant?: "sidebar" | "floating" | "inset";
  collapsible?: "offcanvas" | "icon" | "none";
}) {
  const { open } = useSidebar();

  return (
    <ShadCnSidebar
      side={side}
      variant={variant}
      collapsible={collapsible}
      className={className}
      inert={collapsible === "offcanvas" && !open ? true : undefined}
      {...props}
    >
      {children}
    </ShadCnSidebar>
  );
}

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
      className={cn("z-20 size-7 hover:bg-sidebar-accent", className)}
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
