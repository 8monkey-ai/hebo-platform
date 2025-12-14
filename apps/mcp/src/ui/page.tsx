import {
  ArrowDown,
  CalendarClock,
  ExternalLinkIcon,
  Tally5,
} from "lucide-react";

import "./assets//global.css";
import brain from "./assets/brain.svg";
import discord from "./assets/discord.svg";
import gauge from "./assets/gauge.svg";
import github from "./assets/github.svg";
import heboCloud from "./assets/hebo.png";
import layers from "./assets/layers.svg";
import logo from "./assets/logo.png";
import reddit from "./assets/reddit.svg";
import x from "./assets/x.svg";
import { CodeBlock, CodeGroup } from "./components/code";
import { CopyButton } from "./components/copy-button";
import { Field, FieldContent, FieldLabel } from "./components/field";
import { FontSwitcher } from "./components/font-switcher";
import { RadioGroup, RadioGroupItem } from "./components/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./components/select";
import { TabsContent, TabsList, TabsTrigger } from "./components/tabs";

const CODE_SNIPPET = `import { experimental_createMCPClient as createMCPClient } from '@ai-sdk/mcp';

const mcpClient = await createMCPClient({
  transport: {
    type: 'http',
    url: 'https://mcp.hebo.ai/aikit/',
  },
}); 

const { counting_letters } = await loadMcpTools();

const result = await streamText({
  model: "openai/gpt-oss-20b",
  tools: { counting_letters },
  prompt: "How many r's in Strawberry?",
  onFinish: async () => {
    await mcpClient.close();
  },
});`;

const SCHEMA = `{
  "name": "count_letters",
  "description": "Counts occurrences of specific letters in a given word",
  "inputSchema": {
      "type": "object",
      "properties": {
          "word": {
              "description": "The word to analyze",
              "type": "string"
          },
          "letters": {
              "description": "The letters to count (e.g., 'aeiou' for vowels)",
              "type": "string"
          }
      },
      "required": [
          "word",
          "letters"
      ]
  }
}`;

export function Page() {
  return (
    <div className="m-auto flex w-full max-w-6xl flex-col gap-10 p-5 sm:py-6">
      <header>
        <nav className="flex flex-row items-center justify-between">
          <div className="flex flex-row items-center text-lg font-semibold sm:text-xl">
            <a
              href="https://hebo.ai"
              className="contents"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://hebo.ai/icon.png"
                alt="Hebo Logo"
                className="mr-2 inline h-6 w-6 sm:h-8 sm:w-8"
              />
              hebo.ai
            </a>
          </div>
          <FontSwitcher />
          <div className="flex flex-row items-center gap-6">
            <a
              href="https://x.com/heboai"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src={x} alt="X Logo" className="size-4.5" />
            </a>
            <a
              href="https://discord.com/invite/cCJtXZRU5p"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src={discord} alt="Discord Logo" className="size-4.5" />
            </a>
            <a
              href="https://github.com/8monkey-ai/hebo"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src={github} alt="Github Logo" className="size-4.5" />
            </a>
            <a
              href="https://cloud.hebo.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl border-2 border-indigo-800 px-4 py-1 text-sm font-medium hover:bg-indigo-50"
            >
              Cloud
            </a>
          </div>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-20">
        <div
          id="hero"
          className="mx-auto flex max-w-4xl flex-col gap-4 text-center"
        >
          <img src={logo} alt="MCP Hero" className="mx-auto size-42" />
          <h1 className="relative mx-auto w-fit text-4xl font-semibold">
            Ready-to-use <span className="text-nowrap">MCP Servers</span>
            <span className="absolute rotate-10 rounded-md bg-lime-600 px-2 py-0.5 text-base text-white sm:-top-4 sm:-right-8">
              FREE
            </span>
          </h1>
          <p className="max-w-2xl text-sm sm:text-base">
            When Agents Struggle, MCP Solves It — Counting, Dates, Units, and
            More. Experiment freely. Deploy reliably. We host for you.
          </p>
          <p className="mx-auto flex flex-row items-center gap-2 font-semibold text-indigo-800">
            <a href="aikit/" target="_blank" rel="noopener noreferrer">
              https://mcp.hebo.ai/aikit/
            </a>
            <CopyButton value="https://mcp.hebo.ai/aikit/" />
          </p>
        </div>

        <div className="flex flex-col">
          <h2 className="mb-4 text-xl font-semibold">
            Discover available toolkits
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="bg-secondary flex flex-col gap-2 rounded-md p-4 text-sm hover:bg-slate-100">
              <a href="#code-samples" className="contents">
                <div className="flex flex-row items-center gap-1 font-semibold">
                  <Tally5 />
                  Counting
                  <a
                    href="#code-samples"
                    className="ml-auto rounded-md border border-indigo-800 px-3 py-1 text-sm font-semibold text-indigo-800 hover:bg-indigo-100"
                  >
                    Connect
                  </a>
                </div>
                <div>How many r’s are there in “Strawberry”?</div>
              </a>
            </div>
            <div className="bg-secondary flex flex-col gap-2 rounded-md p-4 text-sm hover:bg-slate-100">
              <div className="flex flex-row items-center gap-1 font-semibold">
                <CalendarClock />
                Date Time
                <span className="text-muted-foreground ml-auto text-sm font-semibold">
                  Coming Soon
                </span>
              </div>
              <div>Convert dates and times into specific time zones</div>
            </div>
            <div className="bg-secondary flex flex-col gap-2 rounded-md p-4 text-sm hover:bg-slate-100">
              <a
                href="#reddit"
                className="contents"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="m-auto flex w-full flex-row items-center justify-between gap-4">
                  <img src={reddit} alt="Reddit Logo" className="size-12" />
                  <div>
                    <div className="font-semibold">What do you need?</div>
                    <div>Request new toolkits</div>
                  </div>
                  <ExternalLinkIcon className="m-2 ml-auto" />
                </div>
              </a>
            </div>
          </div>

          <div className="text-muted-foreground mt-8 flex flex-row items-center justify-center gap-2 text-sm sm:text-base">
            Use our pre-hosted tools with any LLM & AI SDK{" "}
            <ArrowDown size={18} className="animate-bounce" />
          </div>
        </div>

        <div
          id="code-samples"
          className="flex w-full flex-col gap-4 rounded-md bg-slate-100 p-4 sm:grid sm:grid-cols-[38fr_62fr] sm:gap-8"
        >
          <div className="flex min-w-0 flex-col gap-4">
            <h2 className="text-xl font-semibold">Get started in 60 seconds</h2>
            <Select defaultValue="Counting">
              <SelectTrigger className="bg-background w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Counting">Counting</SelectItem>
                <SelectSeparator />
                <SelectItem disabled={true}>More coming soon …</SelectItem>
              </SelectContent>
            </Select>
            <RadioGroup defaultValue="count_letters">
              <FieldLabel htmlFor="count_letters">
                <Field orientation="horizontal">
                  <FieldContent>
                    <div className="font-semibold">Count Letters</div>
                    <div className="">
                      Counts occurrences of specific letters in a given word
                    </div>
                  </FieldContent>
                  <RadioGroupItem value="count_letters" id="count_letters" />
                </Field>
              </FieldLabel>
              <FieldLabel className="border-dashed">
                <Field>
                  <div className="text-muted-foreground">
                    More coming soon …
                  </div>
                </Field>
              </FieldLabel>
            </RadioGroup>
          </div>
          <div className="flex h-84 min-w-0">
            <CodeGroup defaultValue="vercel">
              <TabsList>
                <TabsTrigger value="vercel">Vercel AI SDK</TabsTrigger>
                <TabsTrigger value="schema">Schema</TabsTrigger>
              </TabsList>
              <TabsContent value="vercel">
                <CodeBlock>{CODE_SNIPPET}</CodeBlock>
              </TabsContent>
              <TabsContent value="schema">
                <CodeBlock>{SCHEMA}</CodeBlock>
              </TabsContent>
            </CodeGroup>
          </div>
        </div>

        <section className="mx-auto max-w-3xl space-y-2 text-base leading-relaxed font-normal">
          <h2 className="text-xl font-semibold">Why we built mcp.hebo.ai</h2>
          <p>We didn’t set out to build a platform.</p>
          <p>
            We were experimenting with agents and needed{" "}
            <strong>something quick to test whether MCP actually works</strong>
            —not in theory, but end-to-end, against a real server. Most MCP
            servers we found lived on GitHub, which was great for learning, but
            meant <strong>self-hosting, wiring, and maintenance</strong> just to
            run an experiment.
          </p>
          <p>
            At the same time, we kept discovering the same truth: there’s a
            whole class of things agents are <strong>not good at</strong>.
            Counting, validation, precise lookups, deterministic logic—these
            aren’t model problems, they <strong>need tools</strong>.
          </p>
          <p>
            The MCP SDK didn’t make this easier. While is has{" "}
            <strong>plenty of examples</strong>, they’re{" "}
            <strong>very low-level</strong> and often{" "}
            <strong>overly complicated</strong>, making it hard to see how
            everything fits together in a real system.
          </p>
          <p>
            At the end of the day,{" "}
            <strong>
              tools are just simple functions with a human readable description
              of their functionality
            </strong>
            , which agents can use to decide when to call them.
          </p>
          <p>
            So <strong>mcp.hebo.ai</strong> became our shortcut: a{" "}
            <strong>live MCP server</strong>, <strong>real tools</strong>, and a
            place to <strong>prove MCP works by actually using it</strong>. What
            started as a test harness stuck around—because once the tools exist,
            you don’t want to rebuild them every time.
          </p>
          <p>
            We’ll <strong>keep adding tools over time</strong>, focusing on the
            kinds of capabilities agents consistently struggle with.
          </p>
          <p>
            <strong>mcp.hebo.ai</strong> exists so experimenting with MCP
            doesn’t start with <strong>infrastructure</strong>—and agents don’t
            have to pretend they can do everything.
          </p>
        </section>

        <section className="border-border rounded-xl border bg-slate-100 p-6 ">
          <div className="relative grid gap-8 sm:grid-cols-[1.05fr_1fr] sm:items-center">
            <div className="flex items-center gap-4">
              <img
                src={heboCloud}
                alt="Hebo Cloud"
                className="h-20 w-20 sm:h-32 sm:w-32"
              />
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-semibold sm:text-3xl">
                  Hebo Cloud
                </h2>
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
                    className="font-semibold text-indigo-800 hover:underline"
                  >
                    Start for free →
                  </a>
                </div>
              </div>
            </div>
            <div className="grid w-full gap-3 sm:grid-cols-3">
              <div className="flex gap-2 rounded-xl bg-white/70 p-4 sm:flex-col">
                <img
                  src={brain}
                  aria-hidden
                  alt=""
                  className="size-10 text-indigo-800"
                />
                <div>
                  <div className="text-sm font-semibold">Model Gateway</div>
                  <div className="text-muted-foreground text-xs">
                    Instant access to completions & embeddings for SOTA models.
                  </div>
                </div>
              </div>
              <div className="flex gap-2 rounded-xl bg-white/70 p-4 sm:flex-col">
                <img
                  src={layers}
                  aria-hidden
                  alt=""
                  className="size-10 text-indigo-800"
                />
                <div>
                  <div className="text-sm font-semibold">Own The Stack</div>
                  <div className="text-muted-foreground text-xs">
                    Opt-into RAG, tools & memory to steer conversation quality.
                  </div>
                </div>
              </div>
              <div className="flex gap-2 rounded-xl bg-white/70 p-4 sm:flex-col">
                <img
                  src={gauge}
                  aria-hidden
                  alt=""
                  className="size-10 text-indigo-800"
                />
                <div>
                  <div className="text-sm font-semibold">Evalute & Observe</div>
                  <div className="text-muted-foreground text-xs">
                    Empower dev and business teams to iterate quickly.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="flex flex-wrap justify-center gap-2 text-xs sm:text-sm">
        <div className="flex items-center gap-1 whitespace-nowrap">
          <img
            src="https://hebo.ai/icon.png"
            alt="Hebo Logo"
            className="size-4"
          />
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
      </footer>
    </div>
  );
}
