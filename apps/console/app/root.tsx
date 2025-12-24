import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";

import { ErrorView } from "./components/ui/ErrorView";

import type { Route } from "./+types/root";

import "./init";

import "./styles/tailwind.css";
import "./styles/global.css";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    // eslint-disable-next-line no-secrets/no-secrets
    href: "https://fonts.googleapis.com/css2?family=Recursive:wght,MONO@400..600,0..1&display=block",
  },
  { rel: "icon", href: "/hebo-icon.png" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="referrer" content="no-referrer" />
        <title>Hebo Cloud</title>
        <meta
          name="description"
          content="The fastest way to build &amp; scale agents"
        />
        <Meta />
        <Links />
      </head>
      <body className="min-h-dvh">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary() {
  return <ErrorView />;
}
