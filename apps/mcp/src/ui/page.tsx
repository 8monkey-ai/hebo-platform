import { useState } from "react";

import "./global.css";
import { Button } from "./components/button";

export function Page() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-8">
        <h1 className="text-4xl font-bold">Hello World 🐵</h1>
        <div className="flex flex-col items-center gap-4">
          <p className="text-xl">Count: {count}</p>
          <div className="flex gap-2">
            <Button onClick={() => setCount((c) => c - 1)}>Decrement</Button>
            <Button onClick={() => setCount((c) => c + 1)}>Increment</Button>
            <Button onClick={() => setCount(0)}>Reset</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
