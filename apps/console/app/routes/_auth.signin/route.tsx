import { Ban, BookOpen, CreditCard } from "lucide-react";

import { Badge } from "@hebo/shared-ui/components/Badge";
import { Button } from "@hebo/shared-ui/components/Button";

import { Logo } from "~console/components/ui/Logo";

import { MagicLinkSignIn } from "./magiclink";
import { OAuthSignIn } from "./oauth";


export default function SignIn() {
  return (
    <div className="relative min-h-dvh">
      {/* Marketing Message */}
      <aside className="fixed min-h-dvh w-lg -translate-x-full bg-accent bg-[url(/login-bg.png)] bg-bottom-left bg-no-repeat transition-transform duration-300 ease-in-out lg:translate-x-0">
        <Button
          variant="secondary"
          className="absolute top-5 left-6"
          nativeButton={false}
          render={
            <a
              href="https://docs.hebo.ai"
              target="_blank"
              rel="noopener noreferrer"
            >
              <BookOpen />
              <span>Docs</span>
            </a>
        } />

        <div className="space-y-5 px-19 py-30 text-xl">
          <div className="flex items-center gap-2 text-3xl font-semibold">
            Hebo is{}
            <Badge className="text-foreground bg-lime-400 text-3xl h-10 font-semibold">
              FREE
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="font-semibold">Deploy agents to production:</div>
            <ul className="space-y-2">
              <li>
                ✔️ Choose from a set of free open-source models
              </li>
              <li>
                ✔️ Use commercial models within fair-usage
              </li>
              <li>
                ✔️ Link your custom inference endpoints to use existing credits
              </li>
            </ul>
          </div>
          <span className="font-semibold">Save money</span> on commercial models
          with our built-in cache and optimised routing to the cheapest cloud
          provider.
        </div>
      </aside>

      {/* Login Components */}
      <main className="flex min-h-dvh flex-1 items-center justify-center transition-all duration-300 lg:ml-128">
        <div className="flex w-xs flex-col items-center gap-4">
          <Logo />
          <p className="text-center text-base">
            The fastest way to build & scale agents
          </p>

          <div className="w-full space-y-4">
            <OAuthSignIn />
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-gray-300" />
              <span className="text-sm whitespace-nowrap">or</span>
              <div className="h-px flex-1 bg-gray-300" />
            </div>
            <MagicLinkSignIn />
          </div>

          <div className="flex items-center gap-2">
            <span className="relative">
              <Ban className="h-4 w-4" />
              <CreditCard className="absolute top-1 left-1 h-2 w-2" />
            </span>
            <span className="text-sm">No credit card required</span>
          </div>
        </div>
      </main>
    </div>
  );
}
