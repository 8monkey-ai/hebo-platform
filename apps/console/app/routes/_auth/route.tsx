import { BookOpen } from "lucide-react";
import { Outlet } from "react-router";

import { Badge } from "@hebo/shared-ui/components/Badge";
import { Button } from "@hebo/shared-ui/components/Button";

export default function AuthLayout() {
  return (
    <div className="relative min-h-dvh">
      <aside className="fixed min-h-dvh w-lg -translate-x-full bg-accent bg-[url(/login-bg.png)] bg-bottom-left bg-no-repeat transition-transform duration-300 ease-in-out lg:translate-x-0">
        <Button
          variant="secondary"
          className="absolute top-5 left-6"
          nativeButton={false}
          render={
            // oxlint-disable-next-line jsx-no-target-blank - safe for internal links
            <a href="https://hebo.ai/docs" target="_blank" rel="noopener">
              <BookOpen />
              <span>Docs</span>
            </a>
          }
        />

        <div className="space-y-5 px-19 py-30 text-xl">
          <div className="flex items-center gap-2 text-3xl font-semibold">
            Hebo is{}
            <Badge className="h-10 bg-lime-400 text-3xl font-semibold text-foreground">FREE</Badge>
          </div>
          <div className="space-y-2">
            <div className="font-semibold">Deploy agents to production:</div>
            <ul className="space-y-2">
              <li>✔️ Choose from a set of free open-source models</li>
              <li>✔️ Use commercial models within fair-usage policy</li>
              <li>✔️ Bring your own key to use 3rd party credits</li>
            </ul>
          </div>
          <span className="font-semibold">Get in touch</span> with us on{" "}
          <a href="https://discord.com/invite/cCJtXZRU5p" target="_blank" rel="noopener noreferrer">
            Discord
          </a>{" "}
          to learn about our special programs, including student ambassadors.
        </div>
      </aside>

      <main className="flex min-h-dvh flex-1 items-center justify-center transition-all duration-300 lg:ml-128">
        <Outlet />
      </main>
    </div>
  );
}
