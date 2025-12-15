import { Link } from "react-router";

import { Discord, Github, X } from "./components/icons";

export default function Header() {
  return (
    <header>
      <nav className="grid grid-cols-[1fr_auto] items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
        <div className="flex flex-row items-center gap-2 text-lg font-semibold sm:text-xl">
          <Link to="/" className="contents">
            <img
              src="https://hebo.ai/icon.png"
              alt="Hebo Logo"
              className="h-6 w-6 sm:h-8 sm:w-8"
            />
            hebo.ai
          </Link>
        </div>
        <div className="hidden flex-row items-center justify-center gap-6 sm:flex">
          <a
            href="https://console.hebo.ai"
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
          >
            Gateway
          </a>
          <Link to="/mcp" className="hover:underline">
            MCP
          </Link>
          <Link to="/evals" className="hover:underline">
            Evals
          </Link>
        </div>
        <div className="flex flex-row items-center justify-end gap-6">
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
          <a
            href="https://console.hebo.ai"
            target="_blank"
            className="rounded-2xl border-2 border-indigo-800 px-4 py-1 text-sm font-medium hover:bg-indigo-50"
            rel="noreferrer"
          >
            Cloud
          </a>
        </div>
      </nav>
    </header>
  );
}
