import {
  ArrowDown,
  CalendarClock,
  ExternalLinkIcon,
  Tally5,
} from "lucide-react";

import { Badge } from "./components/badge";
import { Button } from "./components/button";
import { CodeBlock, CodeGroup } from "./components/code";
import { CopyButton } from "./components/copy-button";
import { Field, FieldContent, FieldLabel } from "./components/field";
import { Discord, Github, Reddit, X } from "./components/icons";
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

import "./global.css";
import logo from "./logo.png";

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
          <div className="flex flex-row items-center gap-6">
            <a
              href="https://x.com/heboai"
              target="_blank"
              rel="noopener noreferrer"
            >
              <X size={18} />
            </a>
            <a
              href="https://discord.com/invite/cCJtXZRU5p"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Discord size={18} />
            </a>
            <a
              href="https://github.com/8monkey-ai/hebo"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github size={18} />
            </a>
            <Button
              variant="outline"
              className="rounded-2xl border-2 border-indigo-800 px-4 font-semibold"
            >
              <a
                href="https://cloud.hebo.ai"
                target="_blank"
                rel="noopener noreferrer"
              >
                Cloud
              </a>
            </Button>
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
            <Badge className="absolute rotate-10 bg-lime-600 text-base text-white sm:-top-3 sm:-right-8 sm:p-2.5">
              FREE
            </Badge>
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
                  <Button variant="outline" size="sm" className="ml-auto">
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground ml-auto"
                >
                  Coming Soon
                </Button>
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
          className="bg-secondary flex w-full flex-col gap-4 rounded-md p-4 sm:grid sm:grid-cols-[38fr_62fr] sm:gap-8"
        >
          <div className="flex min-w-0 flex-col gap-4">
            <h2 className="text-xl font-semibold ">
              Get started in 60 seconds
            </h2>
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
