import { XCircle, SquareChevronRight } from "lucide-react";
import { Outlet, unstable_useRoute as useRoute, useLocation } from "react-router";
import { useRef, useEffect } from "react";
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

import { authService } from "~console/lib/auth";
import { api, gateway } from "~console/lib/service";
import { dontRevalidateOnFormErrors } from "~console/lib/errors";
import { getCookie, kbs } from "~console/lib/utils";
import { shellStore } from "~console/lib/shell";
import { PageLoader } from "~console/components/ui/PageLoader";

import { AgentSelect } from "./sidebar-agent";
import { BranchSelect } from "./sidebar-branch";
import { SidebarPlatform } from "./sidebar-platform";
import { PlaygroundSidebar } from "./sidebar-playground";
import { UserMenu } from "./sidebar-user";
import { SidebarNav } from "./sidebar-nav";

import type { Route } from "./+types/route";


async function authMiddleware() {
  await authService.ensureSignedIn();
}

export const clientMiddleware = [authMiddleware];

export async function clientLoader() {
  const agents = await api.agents.get();

  if (!shellStore.models) {
    const models = await gateway.models.get({ query: { endpoints: true }});
  
    const supportedModels = Object.fromEntries(
      (models.data?.data ?? []).map((m) => [
        m.id,
        {
          name: m.name,
          modality: m.architecture.output_modalities[0],
          providers: m.endpoints?.map((e) => e.tag) ?? [],
          monthlyFreeTokens: m.pricing?.monthly_free_tokens ?? 0,
        }
      ]));
  
    shellStore.models = supportedModels;
  }

  return { agents: agents?.data ?? [] };
}

export { dontRevalidateOnFormErrors as shouldRevalidate }


export default function ShellLayout({ loaderData: { agents } }: Route.ComponentProps) { 
  const { user } = useSnapshot(shellStore);

  const { 
    agent: activeAgent, 
    branch: activeBranch
  } = useRoute("routes/_shell.agent.$agentSlug")?.loaderData ?? {};
  
  // Focus main element on route change for keyboard nav
  const location = useLocation();
  const mainRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    mainRef.current?.focus();
  }, [location]);

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
          "--sidebar-width-mobile": "12rem",
          "--sidebar-width-icon": "4rem",
        } as React.CSSProperties
      }
    >

      <Sidebar collapsible="icon">
        <div className="h-full flex flex-col group-data-[state=collapsed]:px-2 transition-[padding]">
          <SidebarHeader>
            <AgentSelect agents={agents} activeAgent={activeAgent} />
            {activeAgent && (
              <BranchSelect
                activeAgent={activeAgent}
                activeBranch={activeBranch}
              />
            )}
          </SidebarHeader>
          <SidebarContent>
            {activeAgent && activeBranch && (
            <SidebarGroup>
              <SidebarNav activeAgent={activeAgent} activeBranch={activeBranch} />
            </SidebarGroup>
            )}
          </SidebarContent>
          <SidebarFooter>
              {activeAgent && activeBranch && (
                <>
                  <SidebarSeparator className="mx-0" />
                  <SidebarPlatform activeAgent={activeAgent} activeBranch={activeBranch} />
                </>
              )}
              <SidebarSeparator className="mx-0" />
              <UserMenu user={user} />
          </SidebarFooter>
        </div>
      </Sidebar>

      <SidebarInset className="min-w-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarTrigger className="fixed m-2" />
          </TooltipTrigger>
          <TooltipContent side="right">
            Toggle Sidebar ({kbs("mod+S")})
          </TooltipContent>
        </Tooltip>
        <Toaster
          position="top-right"
          icons={{error: <XCircle className="size-4" aria-hidden="true" />}}
        />
        <div ref={mainRef} tabIndex={-1} className="min-w-0 flex flex-1 flex-col focus:outline-none gap-4 px-4 sm:px-10 py-10">
          <div className="mx-auto max-w-4xl min-w-0 w-full">
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
            "--sidebar-width-mobile": "24rem", 
            "--sidebar-width-icon": "0rem",
          } as React.CSSProperties
        }
      >
        <SidebarTrigger 
          className="fixed top-3 right-2 w-fit" 
          icon={<div className="flex items-center space-x-1.5">
              <SquareChevronRight size={16} />
              <span>Playground</span>
              <span className="text-muted-foreground">
                {kbs("mod+P")}
              </span>
            </div>} 
          />
        <Sidebar side="right" collapsible="offcanvas">
          <SidebarContent>
            <PlaygroundSidebar activeAgent={activeAgent} activeBranch={activeBranch} />
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>

    </SidebarProvider>
  );
}
