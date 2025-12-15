import {
  ArrowDown,
  CalendarClock,
  ExternalLinkIcon,
  Tally5,
} from "lucide-react";

import { Button } from "~www/components/button";
import { CodeBlock, CodeGroup } from "~www/components/code";
import { CopyButton } from "~www/components/copy-button";
import { Field, FieldLabel, FieldContent } from "~www/components/field";
import { Reddit } from "~www/components/icons";
import { RadioGroup, RadioGroupItem } from "~www/components/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "~www/components/select";
import { TabsContent, TabsList, TabsTrigger } from "~www/components/tabs";

export function meta() {
  return [
    { title: "Hebo MCP: Ready-to-use MCP Servers" },
    {
      name: "description",
      content:
        "When Agents Struggle, MCP Solves It — Counting, Dates, Units, and More. Experiment freely. Deploy reliably. We host for you.",
    },
  ];
}

const CODE_SNIPPET = `import { experimental_createMCPClient as createMCPClient } from '@ai-sdk/mcp';

const mcpClient = await createMCPClient({
  transport: {
    type: 'http',
    url: 'https://mcp.hebo.ai/aikit/',
  },
}); 

const { counting_letters } = await mcpClient.tools();

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

export default function MCP() {
  return (
    <>
      <div
        id="hero"
        className="mx-auto flex max-w-4xl flex-col gap-4 text-center"
      >
        <img src="/hebo-mcp.png" alt="MCP Hero" className="mx-auto size-42" />
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
          <a href="https://mcp.hebo.ai/" target="_blank" rel="noreferrer">
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
                <Button
                  variant="outline"
                  className="ml-auto border-indigo-800 px-3 text-indigo-800"
                >
                  Connect
                </Button>
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
            {/* FUTURE: create reddit thread */}
            <a href="#reddit" className="contents">
              <div className="m-auto flex w-full flex-row items-center justify-between gap-4">
                <Reddit size={48} />
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
                <div className="text-muted-foreground">More coming soon …</div>
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
          At the same time, we kept discovering the same truth: there’s a whole
          class of things agents are <strong>not good at</strong>. Counting,
          validation, precise lookups, deterministic logic—these aren’t model
          problems, they <strong>need tools</strong>.
        </p>
        <p>
          The MCP SDK didn’t make this easier. While it has{" "}
          <strong>plenty of examples</strong>, they’re{" "}
          <strong>very low-level</strong> and often{" "}
          <strong>overly complicated</strong>, making it hard to see how
          everything fits together in a real system.
        </p>
        <p>
          At the end of the day,{" "}
          <strong>
            tools are just simple functions with a human readable description of
            their functionality
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
          <strong>mcp.hebo.ai</strong> exists so experimenting with MCP doesn’t
          start with <strong>infrastructure</strong>—and agents don’t have to
          pretend they can do everything.
        </p>
      </section>
    </>
  );
}
