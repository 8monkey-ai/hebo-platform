import React from "react";

import { Button } from "@hebo/shared-ui/components/Button";

import { Github, Google, Microsoft } from "~console/components/ui/Icons";
import { authService } from "~console/lib/auth";

export function OAuthSignIn() {
  return (
    <>
      <SignInButton provider="github" icon={Github} />
      <SignInButton provider="google" icon={Google} />
      <SignInButton provider="microsoft" icon={Microsoft} />
    </>
  );
}

function SignInButton({ provider, icon: Icon }: { provider: string; icon?: React.ComponentType }) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();

  return (
    <>
      <Button
        variant="outline"
        className="relative w-full"
        isLoading={isLoading}
        onClick={async () => {
          try {
            setIsLoading(true);
            await authService.signInWithOAuth(provider);
          } catch (error) {
            if (error instanceof Error) setError(error.message);
          } finally {
            setIsLoading(false);
          }
        }}
      >
        {!isLoading && (
          <>
            {Icon && (
              <span className="absolute left-4">
                <Icon aria-hidden="true" />
              </span>
            )}
            Sign in with {provider.charAt(0).toUpperCase()}
            {provider.slice(1)}
          </>
        )}
      </Button>
      {error && <div className="text-sm text-destructive">{error}</div>}
    </>
  );
}
