import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useLoaderData, useNavigate } from "react-router";
import { useEffect } from "react";

import { Alert, AlertTitle } from "@hebo/shared-ui/components/Alert";
import { Button } from "@hebo/shared-ui/components/Button";

import { Logo } from "~console/components/ui/Logo";
import { authService } from "~console/lib/auth";

type LoaderResult = { status: "success" } | { status: "error"; message: string } | { status: "no-id" };

export async function clientLoader({ request }: { request: Request }) {
  const invitationId = new URL(request.url).searchParams.get("id");
  if (!invitationId) return { status: "no-id" } satisfies LoaderResult;

  try {
    await authService.acceptInvitation(invitationId);
    return { status: "success" } satisfies LoaderResult;
  } catch (err) {
    return { status: "error", message: (err as Error).message } satisfies LoaderResult;
  }
}

export default function AcceptInvitation() {
  const data = useLoaderData<LoaderResult>();
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
    <div className="flex min-h-dvh items-center justify-center">
      <div className="flex w-xs flex-col items-center gap-6">
        <Logo />

        {data.status === "success" && (
          <Alert>
            <CheckCircle2 size={16} />
            <AlertTitle>Invitation accepted! Redirecting…</AlertTitle>
          </Alert>
        )}

        {data.status === "error" && (
          <div className="flex flex-col items-center gap-4">
            <Alert variant="destructive">
              <AlertCircle size={16} />
              <AlertTitle>{data.message || "This invitation is expired or invalid."}</AlertTitle>
            </Alert>
            <Button
              variant="outline"
              nativeButton={false}
              render={<a href="/">Go to dashboard</a>}
            />
          </div>
        )}

        {data.status === "no-id" && (
          <div className="flex flex-col items-center gap-4">
            <Alert variant="destructive">
              <AlertCircle size={16} />
              <AlertTitle>No invitation ID provided.</AlertTitle>
            </Alert>
            <Button
              variant="outline"
              nativeButton={false}
              render={<a href="/">Go to dashboard</a>}
            />
          </div>
        )}
      </div>
    </div>
  );
}
