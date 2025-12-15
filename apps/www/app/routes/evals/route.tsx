import { Button } from "~www/components/button";
import { CopyButton } from "~www/components/copy-button";

export function meta() {
  return [
    { title: "Hebo Evals: Evaluate Prompts / LLMs / Agents" },
    {
      name: "description",
      content:
        "✔ Use simple markdown to write your evals ✔ Connect to any existing LLM or agent  ✔ Integrate with your existing CI / CD pipelines",
    },
  ];
}

export default function MCP() {
  return (
    <div
      id="hero"
      className="mx-auto flex w-full max-w-5xl flex-col items-center gap-8 bg-[url('/hebo-evals.png')] bg-size-[auto_145px] bg-position-[right_calc(100%+50px)] bg-no-repeat sm:my-10 sm:flex-row sm:bg-size-[auto_280px] sm:bg-bottom-right"
    >
      <figure
        id="conversation.md"
        className="w-full max-w-3xl overflow-hidden rounded-2xl border border-gray-200 bg-white p-2 shadow-xl sm:max-w-xs"
      >
        <figcaption className="flex items-center justify-center text-sm font-medium text-gray-500">
          conversation.md
        </figcaption>
        <pre className="flex flex-col gap-4 p-4 pt-0 text-xs text-wrap">
          <p>
            ---
            <br />
            <span className="font-semibold text-gray-800">
              Evaluators:
            </span>{" "}
            Guideline Adherence
            <br />
            <span className="font-semibold text-gray-800">Tools:</span> Order
            Mgmt, Hand-off
            <br />
            ---
          </p>

          <p>
            <span className="font-semibold text-purple-800">System:</span> You
            are a helpful and concise assistant for an e-commerce platform. Keep
            answers short and friendly.
          </p>

          <p>
            <span className="font-semibold text-blue-800">User:</span> Hi! Can
            you track my order?
          </p>

          <p>
            <span className="font-semibold text-purple-800">Assistant:</span> Of
            course! Could you share your order ID, please?
          </p>

          <p>
            <span className="font-semibold text-blue-800">User:</span> Sure,
            it&apos;s #8927341.
          </p>

          <p>
            <span className="font-semibold text-gray-800">Tool:</span> Order
            Mgmt(#8927341)
          </p>

          <p>
            <span className="font-semibold text-purple-800">Assistant:</span>{" "}
            Thanks! Your order is on the way and should arrive tomorrow.
          </p>
        </pre>
      </figure>

      <div id="message" className="flex flex-col gap-4">
        <div className="text-4xl font-light">Hebo Evals</div>
        <div className="max-w-md text-5xl font-medium">
          Evaluate <span className="underline decoration-dotted">Prompts</span>{" "}
          / <span className="underline decoration-dotted">LLMs</span> /{" "}
          <span className="underline decoration-dotted">Agents</span>{" "}
        </div>
        <ul className="text-lg/7">
          <li>✔ Write evals in simple markdown</li>
          <li>✔ Connect to an existing LLM or agent</li>
          <li>✔ Integrate with your CI / CD pipeline</li>
        </ul>
        <div className="flex gap-4">
          <Button className="text-medium h-10 bg-indigo-900 px-5 text-white hover:bg-indigo-800">
            <a href="https://docs.hebo.ai/" target="_blank" rel="noreferrer">
              Get Started
            </a>
          </Button>
          <Button className="h-10 rounded-xl border-2 border-solid border-indigo-800 bg-stone-100 px-5 text-base font-semibold text-stone-900 hover:bg-stone-200">
            <a href="https://docs.hebo.ai/" target="_blank" rel="noreferrer">
              Docs
            </a>
          </Button>
        </div>
        <pre className="text-medium flex items-center gap-2">
          $ npm install hebo-evals@latest
          <CopyButton
            value="npm install hebo-evals@latest"
            className="cursor-pointer text-gray-500 hover:text-gray-900"
          />
        </pre>
      </div>
    </div>
  );
}
