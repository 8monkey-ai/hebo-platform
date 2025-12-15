import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";

import "./app.css";
import Footer from "./footer";
import Header from "./header";

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
];

export function meta() {
  return [
    { title: "Hebo AI - The fastest way to build conversational agents" },
    {
      name: "description",
      content:
        "Hebo is the fastest way to build and scale high-quality conversational agents. ✔️ All SOTA LLMs ✔️ RAG, Tools & Memory ✔️ Evaluations & Observability",
    },
  ];
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/png" href="https://hebo.ai/icon.png" />
        <Meta />
        <Links />
      </head>
      <body>
        <div className="m-auto flex w-full max-w-6xl flex-col gap-10 p-5 sm:py-6">
          <Header />
          <main className="mx-auto flex w-full max-w-5xl flex-col gap-20">
            {children}
          </main>
          <Footer />
        </div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <div className="container mx-auto p-4 py-16 text-center">
      <div className="text-6xl">🙉</div>
      <h1 className="text-8xl">{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full overflow-x-auto p-4">
          <code>{stack}</code>
        </pre>
      )}
    </div>
  );
}
