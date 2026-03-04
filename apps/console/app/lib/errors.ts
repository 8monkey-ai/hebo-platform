import isNetworkError from "is-network-error";
import { HTTPError, TimeoutError } from "ky";
import { useEffect } from "react";
import { isRouteErrorResponse, type ShouldRevalidateFunction } from "react-router";
import { toast } from "sonner";

export function parseError(error: unknown) {
  let message: string | undefined;
  let status: number | undefined;

  if (isRouteErrorResponse(error)) {
    const msg = typeof error.data === "string" ? error.data : error.data?.message;
    message = `${error.statusText}: ${msg}`;
    status = error.status;
  } else if (error instanceof TimeoutError) {
    message = `${error.message}`;
  } else if (isNetworkError(error)) {
    message = `Network error: ${error.message}`;
  } else if (error instanceof HTTPError) {
    message = `${error.response.statusText}: ${error.message}`;
    status = error.response.status;
  } else if (error instanceof Error) {
    message = `${error.message}`;
  } else {
    message = "Unknown Error";
  }

  const stack = error instanceof Error && error.stack ? error.stack : undefined;

  let retryable = !!status && (status >= 500 || [408, 409, 425, 429].includes(status));
  if (!retryable && error instanceof TimeoutError) retryable = true;
  if (!retryable && isNetworkError(error)) retryable = true;

  return { message, status, stack, retryable };
}

export function useFormErrorToast(formErrors: Record<string, string[]>) {
  useEffect(() => {
    const errors = Array.isArray(formErrors[""]) ? formErrors[""] : [];

    if (errors.length > 0) {
      for (const msg of errors) {
        toast.error(msg);
      }
    }
  }, [formErrors]);
}

export const dontRevalidateOnFormErrors: ShouldRevalidateFunction = ({
  actionResult,
  defaultShouldRevalidate,
}) => {
  if (
    actionResult &&
    typeof actionResult === "object" &&
    "status" in actionResult &&
    (actionResult as { status?: string }).status !== "success"
  ) {
    return false;
  }
  return defaultShouldRevalidate;
};
