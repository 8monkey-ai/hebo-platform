import "./global.css";

import { createRoot } from "react-dom/client";

import { Counter } from "./components/Counter";

export function Root() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900">
      <div className="flex flex-col items-center gap-8">
        <h1 className="text-4xl font-bold text-white">Hello World 🐵</h1>
        <Counter />
      </div>
    </div>
  );
}

const root = createRoot(document.querySelector("#root")!);
root.render(<Root />);
