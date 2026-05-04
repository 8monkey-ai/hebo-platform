import { XCircle, SquareChevronRight } from "lucide-react";
import { useRef, useEffect } from "react";
import {
  Outlet,
  unstable_useRoute as useRoute,
  useLocation,
  type ShouldRevalidateFunctionArgs,
} from "react-router";
import { Toaster } from "sonner";
import { useSnapshot } from "valtio";

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  SidebarGroup,
} from "@hebo/shared-ui/components/Sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@hebo/shared-ui/components/Tooltip";

import { ErrorView } from "~console/components/ui/ErrorView";
import { PageLoader } from "~console/components/ui/PageLoader";
import { authService } from "~console/lib/auth";
import { revalidateOnSuccessfulAction } from "~console/lib/errors";
import { api, gateway } from "~console/lib/service";
import { shellStore } from "~console/lib/shell";
import { getCookie, kbs } from "~console/lib/utils";

import type { Route } from "./+types/route";
import { HeboWordmark } from "./sidebar-agent";
import { WorkspaceSelect } from "./sidebar-branch";
import { SidebarNav } from "./sidebar-nav";
import { SidebarPlatform } from "./sidebar-platform";
import { PlaygroundSidebar } from "./sidebar-playground";
import { UserMenu } from "./sidebar-user";

async function authMiddleware() {
  await authService.ensureSignedIn();
}

export const clientMiddleware = [authMiddleware];

export async function clientLoader() {
  const [workspaces] = await Promise.all([
    api.workspaces.get(),
    shellStore.models
      ? Promise.resolve()
      : gateway.models
          .get({ query: { endpoints: true } })
          .then((models) => {
            shellStore.models = Object.fromEntries(
              (models.data?.data ?? []).map((m) => [
                m.id,
                {
                  name: m.name ?? "n/a",
                  lab: m.owned_by ?? m.id.split("/")[0] ?? "unknown",
                  modality: m.architecture?.output_modalities?.[0] ?? "n/a",
                  providers: m.endpoints?.map((e) => e.tag) ?? [],
                  free: m.free === true,
                  requiresByok: m.requiresByok === true,
                },
              ]),
            );
            return null;
          })
          .catch(() => {
            // Non-fatal — models will be fetched on next navigation
          }),
  ]);

  return { workspaces: workspaces?.data ?? [] };
}

export function shouldRevalidate(args: ShouldRevalidateFunctionArgs) {
  // Revalidate workspace list when navigating to a different workspace (covers
  // the post-create redirect into /w/:newSlug).
  const currentSlug = (args.currentParams as { workspaceSlug?: string }).workspaceSlug;
  const nextSlug = (args.nextParams as { workspaceSlug?: string }).workspaceSlug;
  if (currentSlug !== nextSlug) return true;
  return revalidateOnSuccessfulAction(args);
}

export default function ShellLayout({ loaderData: { workspaces } }: Route.ComponentProps) {
  const { user, organizations } = useSnapshot(shellStore);

  const activeWorkspace = useRoute("routes/_shell.w.$workspaceSlug")?.loaderData?.workspace;

  // Focus main element on route change for keyboard nav
  const location = useLocation();
  const mainRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    mainRef.current?.focus();
  }, [location.pathname]);

  // FUTURE replace with session storage
  const leftSidebarDefaultOpen = getCookie("left_sidebar_state") === "true";
  const rightSidebarDefaultOpen = getCookie("right_sidebar_state") === "true";

  return (
    <SidebarProvider
      defaultOpen={leftSidebarDefaultOpen}
      cookieName="left_sidebar_state"
      shortcut="s"
      style={
        {
          "--sidebar-width": "12rem",
          "--sidebar-width-icon": "4rem",
        } as React.CSSProperties
      }
    >
      <Sidebar collapsible="icon">
        <div className="flex h-full flex-col transition-[padding] group-data-[state=collapsed]:px-2">
          <SidebarHeader>
            <HeboWordmark />
            <WorkspaceSelect
              workspaces={workspaces}
              activeWorkspace={activeWorkspace}
            />
          </SidebarHeader>
          <SidebarContent>
            {activeWorkspace && (
              <SidebarGroup>
                <SidebarNav activeWorkspace={activeWorkspace} />
              </SidebarGroup>
            )}
          </SidebarContent>
          <SidebarFooter>
            {activeWorkspace && (
              <>
                <SidebarSeparator className="mx-0" />
                <SidebarPlatform activeWorkspace={activeWorkspace} />
              </>
            )}
            <SidebarSeparator className="mx-0" />
            <UserMenu user={user} organizations={organizations} />
          </SidebarFooter>
        </div>
      </Sidebar>

      <SidebarInset className="h-svh min-h-0 min-w-0 bg-transparent">
        <Tooltip>
          <TooltipTrigger render={<SidebarTrigger className="fixed m-2" />} />
          <TooltipContent side="right">Toggle Sidebar ({kbs("mod+S")})</TooltipContent>
        </Tooltip>
        <Toaster
          position="top-right"
          icons={{ error: <XCircle className="size-4" aria-hidden="true" /> }}
        />
        <div
          ref={mainRef}
          tabIndex={-1}
          className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-4 px-4 pt-12 pb-4 focus:outline-none"
        >
          <div className="@container mx-auto flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
            <PageLoader />
            <Outlet />
          </div>
        </div>
      </SidebarInset>

      <SidebarProvider
        cookieName="right_sidebar_state"
        shortcut="p"
        defaultOpen={rightSidebarDefaultOpen}
        className="contents"
        style={
          {
            "--sidebar-width": "24rem",
            "--sidebar-width-icon": "0rem",
          } as React.CSSProperties
        }
      >
        <SidebarTrigger
          className="fixed top-3 right-3 w-fit px-2"
          icon={
            <div className="flex items-center space-x-1.5">
              <SquareChevronRight size={16} />
              <span>Playground</span>
              <span className="text-muted-foreground">{kbs("mod+P")}</span>
            </div>
          }
        />
        <Sidebar side="right" collapsible="offcanvas">
          <SidebarContent>
            <PlaygroundSidebar activeWorkspace={activeWorkspace} />
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>
    </SidebarProvider>
  );
}

export function ErrorBoundary() {
  return <ErrorView />;
}
