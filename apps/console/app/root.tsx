import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";

import { ErrorView } from "./components/ui/ErrorView";

import type { Route } from "./+types/root";

import "./init";

import "@fontsource/recursive/index.css";

import "./styles/tailwind.css";
import "./styles/global.css";

export const links: Route.LinksFunction = () => [
  { rel: "icon", href: "/hebo-icon.png" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
