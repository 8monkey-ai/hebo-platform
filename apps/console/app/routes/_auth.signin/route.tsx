import { Ban, CreditCard } from "lucide-react";

import { Logo } from "~console/components/ui/Logo";
import { magicLinkAuth } from "~console/lib/env";

import { MagicLinkSignIn } from "./magiclink";
import { OAuthSignIn } from "./oauth";
import { PasswordSignIn } from "./password";

export default function SignIn() {
  return (
    <div className="flex w-xs flex-col items-center gap-4">
      <Logo />
      <p className="text-center text-base">The fastest way to build & scale agents</p>

      <div className="w-full space-y-4">
        <OAuthSignIn />
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-gray-300" />
          <span className="text-sm whitespace-nowrap">or</span>
          <div className="h-px flex-1 bg-gray-300" />
        </div>
        {magicLinkAuth ? <MagicLinkSignIn /> : <PasswordSignIn />}
      </div>

      <div className="flex items-center gap-2">
        <span className="relative" aria-hidden="true">
          <Ban className="h-4 w-4" />
          <CreditCard className="absolute top-1 left-1 h-2 w-2" />
        </span>
        <span className="text-sm">No credit card required</span>
      </div>
    </div>
  );
}
