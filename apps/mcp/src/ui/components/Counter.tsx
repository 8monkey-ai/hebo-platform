import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-xl">Count: {count}</p>
      <div className="flex gap-2">
        <button
          onClick={() => setCount((c) => c - 1)}
          className="rounded-mdpx-4 py-2 transition-colors"
        >
          Decrement
        </button>
        <button
          onClick={() => setCount((c) => c + 1)}
          className="rounded-md px-4 py-2 transition-colors"
        >
          Increment
        </button>
        <button
          onClick={() => setCount(0)}
          className="rounded-md px-4 py-2 transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
