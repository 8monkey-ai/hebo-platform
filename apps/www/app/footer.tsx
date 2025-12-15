import { Brain, Gauge, SquareFunction } from "lucide-react";

export default function Footer() {
  return (
    <footer className="flex flex-col gap-10">
      <section className="border-border rounded-xl border bg-slate-100 p-6 ">
        <div className="relative grid gap-8 sm:grid-cols-[1.5fr_1fr] sm:items-center">
          <div className="flex items-center gap-4">
            <img
              src="/hebo.png"
              alt="Hebo Cloud"
              className="h-20 w-20 sm:h-32 sm:w-32"
            />
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-semibold sm:text-3xl">Hebo Cloud</h2>
              <p className="text-muted-foreground">
                Hebo is the fastest way to build and scale high-quality
                conversational agents.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="https://cloud.hebo.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-primary hover:bg-primary/70 rounded-xl px-4 py-1 font-medium"
                >
                  Try Hebo Cloud
                </a>
                <a
                  href="https://cloud.hebo.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold hover:underline"
                >
                  Start for free →
                </a>
              </div>
            </div>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-3">
            <div className="flex gap-2 rounded-xl bg-white/70 p-4 sm:flex-col">
              <Brain className="size-10" />
              <div>
                <div className="text-sm font-semibold">Gateway</div>
                <div className="text-muted-foreground text-xs">
                  Instant access to SOTA models
                </div>
              </div>
            </div>
            <div className="flex gap-2 rounded-xl bg-white/70 p-4 sm:flex-col">
              <SquareFunction className="size-10" />
              <div>
                <div className="text-sm font-semibold">MCP</div>
                <div className="text-muted-foreground text-xs">
                  Ready-to-use MCP Servers
                </div>
              </div>
            </div>
            <div className="flex gap-2 rounded-xl bg-white/70 p-4 sm:flex-col">
              <Gauge className="size-10" />
              <div>
                <div className="text-sm font-semibold">Evals</div>
                <div className="text-muted-foreground text-xs">
                  Write evals in Markdown
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap justify-center gap-2 text-xs sm:text-sm">
        <div className="flex items-center gap-1 whitespace-nowrap">
          <img src="/icon.png" alt="Hebo Logo" className="size-4" />
          <span className="font-semibold"> hebo.ai</span>
          <span>is designed, built and backed by</span>
        </div>
        <div className="flex items-center gap-1 whitespace-nowrap">
          <img
            src="https://8monkey.ai/icon.png"
            alt="8monkey Logo"
            className="size-4"
          />
          <span className="font-semibold">Infinite Monkey AI Sdn Bhd</span>
          <span>(202501003121)</span>
        </div>
      </div>
    </footer>
  );
}
