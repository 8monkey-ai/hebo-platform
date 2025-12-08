import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-xl">Count: {count}</p>
      <div className="flex gap-2">
        <button
          onClick={() => setCount((c) => c - 1)}
          className="rounded-md bg-zinc-700 px-4 py-2 transition-colors hover:bg-zinc-600"
        >
          Decrement
        </button>
        <button
          onClick={() => setCount((c) => c + 1)}
          className="rounded-md bg-zinc-700 px-4 py-2 transition-colors hover:bg-zinc-600"
        >
          Increment
        </button>
        <button
          onClick={() => setCount(0)}
          className="rounded-md bg-zinc-700 px-4 py-2 transition-colors hover:bg-zinc-600"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
