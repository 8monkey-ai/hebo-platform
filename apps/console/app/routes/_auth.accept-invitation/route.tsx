import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router";

import { Alert, AlertTitle } from "@hebo/shared-ui/components/Alert";
import { Button } from "@hebo/shared-ui/components/Button";

import { Logo } from "~console/components/ui/Logo";
import { authService } from "~console/lib/auth";

export async function clientLoader({ request }: { request: Request }) {
  const invitationId = new URL(request.url).searchParams.get("id");
  if (!invitationId) return { status: "no-id" as const };

  try {
    await authService.acceptInvitation(invitationId);
    return { status: "success" as const };
  } catch (err) {
    return { status: "error" as const, message: (err as Error).message };
  }
}

export default function AcceptInvitation({
  loaderData: data,
}: {
  loaderData: Awaited<ReturnType<typeof clientLoader>>;
}) {
  const navigate = useNavigate();

  useEffect(() => {
    if (data.status === "success") {
      const timer = setTimeout(() => {
        globalThis.location.replace("/");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [data.status, navigate]);

  return (
    <div className="flex min-h-dvh w-xs flex-col items-center justify-center gap-6 self-center">
      <Logo />

      {data.status === "success" && (
        <Alert>
          <CheckCircle2 />
          <AlertTitle>Invitation accepted! Redirecting…</AlertTitle>
        </Alert>
      )}

      {(data.status === "error" || data.status === "no-id") && (
        <div className="flex flex-col items-center gap-4">
          <Alert variant="destructive">
            <AlertCircle />
            <AlertTitle>
              {data.status === "error"
                ? data.message || "This invitation is expired or invalid."
                : "No invitation ID provided."}
            </AlertTitle>
          </Alert>
          <Button variant="outline" nativeButton={false} render={<a href="/">Go to dashboard</a>} />
        </div>
      )}
    </div>
  );
}
