import { ErrorView } from "~console/components/ui/ErrorView";

// Throw "Not Found" in order to render shell
export function clientLoader() {
  throw new Response("Page does not exist", { status: 404, statusText: "Not Found" });
}

export default function UnknownRoute() {
  return <></>;
}

export function ErrorBoundary() {
  return <ErrorView />;
}
