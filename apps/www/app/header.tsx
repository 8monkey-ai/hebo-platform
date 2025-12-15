import { Link } from "react-router";

import { Discord, Github, X } from "./components/icons";

export default function Header() {
  return (
    <header>
      <nav className="flex flex-row items-center justify-between">
        <div className="flex flex-row items-center text-lg font-semibold sm:text-xl">
          <Link to="/" className="contents">
            <img
              src="https://hebo.ai/icon.png"
              alt="Hebo Logo"
              className="mr-2 inline h-6 w-6 sm:h-8 sm:w-8"
            />
            hebo.ai
          </Link>
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
