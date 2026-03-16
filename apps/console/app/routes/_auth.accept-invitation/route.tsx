import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";

import { Alert, AlertTitle } from "@hebo/shared-ui/components/Alert";
import { Button } from "@hebo/shared-ui/components/Button";

import { Logo } from "~console/components/ui/Logo";
import { authService } from "~console/lib/auth";

type Status = "loading" | "success" | "error" | "no-id";

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const invitationId = searchParams.get("id");
  const [status, setStatus] = useState<Status>(invitationId ? "loading" : "no-id");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!invitationId) return;

    authService
      .acceptInvitation(invitationId)
      .then(() => {
        setStatus("success");
        setTimeout(() => {
          globalThis.location.replace("/");
        }, 1500);
      })
      .catch((err: Error) => {
        setStatus("error");
        setErrorMessage(err.message);
      });
  }, [invitationId]);

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="flex w-xs flex-col items-center gap-6">
        <Logo />

        {status === "loading" && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="animate-spin" size={16} />
            Accepting invitation…
          </div>
        )}

        {status === "success" && (
          <Alert>
            <CheckCircle2 size={16} />
            <AlertTitle>Invitation accepted! Redirecting…</AlertTitle>
          </Alert>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-4">
            <Alert variant="destructive">
              <AlertCircle size={16} />
              <AlertTitle>{errorMessage || "This invitation is expired or invalid."}</AlertTitle>
            </Alert>
            <Button
              variant="outline"
              nativeButton={false}
              render={<a href="/">Go to dashboard</a>}
            />
          </div>
        )}

        {status === "no-id" && (
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
