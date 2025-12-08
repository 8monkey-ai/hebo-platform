import { useEffect, useState } from "react";
import { useNavigation } from "react-router";

export function PageLoader() {
  const navigation = useNavigation();
  const isLoading = navigation.state !== "idle";

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      const ft = globalThis.setTimeout(() => setProgress(100), 0);
      const rt = globalThis.setTimeout(() => setProgress(0), 400);

      return () => {
        clearTimeout(ft);
        clearTimeout(rt);
      };
    }

    const id = setInterval(() => {
      // eslint-disable-next-line sonarjs/pseudo-random
      setProgress((p) => Math.min(p + Math.random() * 10, 90));
    }, 200);

    return () => clearInterval(id);
  }, [isLoading]);

  return (
    <div
      className="fixed top-0 left-0 h-0.5 bg-blue-200 transition-all duration-300 ease-out"
      style={{ width: `${progress}%`, opacity: progress === 0 ? 0 : 1 }}
      aria-hidden="true"
    />
  );
}
