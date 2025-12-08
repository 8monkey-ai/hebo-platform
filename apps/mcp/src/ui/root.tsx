import { Counter } from "./components/Counter";

export function RootContent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900">
      <div className="flex flex-col items-center gap-8">
        <h1 className="text-4xl font-bold text-white">Hello World 🐵</h1>
        <Counter />
      </div>
    </div>
  );
}

export function Home() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" type="image/svg+xml" href="/public/hebo-icon.png" />
        <title>Hebo MCP</title>
        <link rel="stylesheet" href="/static/styles.css" />
      </head>
      <body>
        <div id="root">
          <RootContent />
        </div>
        <script type="module" src="/static/client.js"></script>
      </body>
    </html>
  );
}
