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
          Build agents that actually work
        </h1>
        <p className="max-w-xl text-sm sm:text-base">
          A low-code platform that connects development & business teams.
          Rapidly develop AI agents and scale them with confidence.
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
          Hebo is the fastest way to build & scale high-quality conversational
          agents
        </h2>
        <p>
          Our experience has shown that building{" "}
          <strong>high-quality conversational agents</strong> requires extremely
          close collaboration between{" "}
          <strong>developers and business teams</strong>.
        </p>

        <p>
          Yet today, even simple changes — like adjusting temperature, tweaking
          default agent behavior via the system prompt, or adding additional
          context — still require{" "}
          <strong>code changes and redeployments</strong>. This turns small
          iterations into <strong>days- or weeks-long feedback cycles</strong>.
        </p>

        <p>
          At the same time, existing{" "}
          <strong>observability and evaluation tools</strong> operate at a very
          low technical level. They make it hard for non-technical users to{" "}
          <strong>follow real conversation flows</strong>, debug issues, or
          validate whether an agent behaves as intended.
        </p>

        <p>
          We started <strong>Hebo</strong> to bridge this gap — and to enable
          fast, shared iteration between product, business, and engineering
          teams.
        </p>

        <ul>
          <li>
            <strong>✔️ A unified AI gateway</strong> providing{" "}
            <strong>instant access</strong> to all state-of-the-art LLMs with{" "}
            <strong>low-latency, high-throughput</strong> completions and
            embeddings.
          </li>

          <li>
            <strong>✔️ A composable stack</strong> with primitives for{" "}
            <strong>RAG, Tools, and Memory</strong> that give fine-grained
            control over conversation content and quality.
          </li>

          <li>
            <strong>✔️ An evaluation &amp; observability toolchain</strong>{" "}
            designed to make real conversation flows{" "}
            <strong>visible, debuggable, and testable</strong> — for both
            technical <em>and</em> non-technical teams.
          </li>
        </ul>

        <p>
          <em>Or in short:</em> the Supabase for LLM apps.
        </p>

        <p>
          Every part of Hebo is designed to be <strong>opt-in</strong>, with a
          natural ramp-up as your agent evolves in sophistication — from simple
          prompts to fully-fledged, production-grade agent systems.
        </p>

        <p>
          Hebo is built in the open with an{" "}
          <a href="https://fsl.software/" target="_blank" rel="noreferrer">
            FSL license{" "}
          </a>
          that keeps Hebo free to use for everyone while discouraging harmful
          free-riding. We’re still at the very beginning. Follow us on X (
          <a
            href="https://x.com/heboai"
            target="_blank"
            rel="noreferrer"
            aria-label="Hebo on X"
            className="text-nowrap underline underline-offset-2"
          >
            @heboai
          </a>
          ) to stay up to date, or reach out to us on{" "}
          <a
            href="https://discord.com/invite/cCJtXZRU5p"
            target="_blank"
            rel="noreferrer"
            aria-label="Join the Hebo Discord"
            className="underline underline-offset-2"
          >
            Discord
          </a>{" "}
          to join the conversation.
        </p>
      </section>
    </>
  );
}
