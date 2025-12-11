import "./global.css";

import { Counter } from "./components/Counter";

export function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-8">
        <h1 className="text-4xl font-bold">Hello World 🐵</h1>
        <Counter />
      </div>
    </div>
  );
}
