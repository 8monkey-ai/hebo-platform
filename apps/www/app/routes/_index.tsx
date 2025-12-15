import { Button } from "~www/components/button";

export default function Home() {
  return (
    <>
      <div
        id="hero"
        className="mx-auto flex max-w-4xl flex-col gap-4 text-center"
      >
        <img src="/hebo.png" alt="MCP Hero" className="mx-auto size-42" />
        <h1 className="relative mx-auto w-fit text-4xl font-semibold">
          Scale agents with confidence
        </h1>
        <p className="max-w-2xl text-sm sm:text-base">
          A low-code platform that connects developers & business stakeholders
          to develop AI agents rapidly and scale them with confidence.
        </p>
        <div className="mx-auto flex gap-4">
          <Button
            render={
              // eslint-disable-next-line jsx-a11y/anchor-has-content
              <a
                href="https://console.hebo.ai/"
                target="_blank"
                rel="noreferrer"
              />
            }
            className="text-medium h-10 bg-indigo-900 px-5 text-white hover:bg-indigo-800"
          >
            Get Started
          </Button>
          <Button
            render={
              // eslint-disable-next-line jsx-a11y/anchor-has-content
              <a
                href="https://docs.hebo.ai/"
                target="_blank"
                rel="noreferrer"
              />
            }
            className="h-10 rounded-xl border-2 border-solid border-indigo-800 bg-stone-100 px-5 text-base font-semibold text-stone-900 hover:bg-stone-200"
          >
            Docs
          </Button>
        </div>
      </div>

      <section className="mx-auto max-w-3xl space-y-2 text-base leading-relaxed font-normal">
        <h2 className="text-xl font-semibold">
          Hebo is the fastest way to build and scale conversational agents
        </h2>
        <p>
          <strong>Hebo</strong> is the fastest way to build and scale
          high-quality conversational agents:
        </p>

        <ul>
          <li>
            ✔️ A gateway that unifies access to all SOTA LLMs provides
            low-latency / high-throughput completions &amp; embeddings.
          </li>
          <li>
            ✔️ A stack with primitives for RAG, Tools &amp; Memory allows
            fine-grained control over conversation content &amp; quality.
          </li>
          <li>
            ✔️ A toolchain for Evaluations &amp; Observability enables tech and
            business teams to iterate quickly on agent capabilities.
          </li>
        </ul>

        <p>
          <em>Or in short:</em> the Supabase for LLM apps.
        </p>
      </section>
    </>
  );
}
