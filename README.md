# Hebo Platform

**Build agents that actually work.**

A platform that brings development and business teams together. Iterate fast. Reach production. Improve continuously.

[Hebo Cloud](https://console.hebo.ai/) | [Docs](https://hebo.ai/docs) | [Blog](https://hebo.ai/blog) | [Discord](https://discord.com/invite/cCJtXZRU5p)

## Key features

- **Gateway** — Unified access to state-of-the-art LLMs with native support for `/chat/completions` (OpenAI), `/responses` (OpenResponses), and `/messages` (Anthropic). Embeddings and multi-turn conversations out of the box.
- **Observability** — Conversation-level traces with token and latency tracking, tool call inspection, and full conversation replay — not just individual request logs.
- **Evaluations** — Define evals as simple Markdown files. Test agent behavior against guidelines, tool usage, and hand-off triggers.

<p align="center">
  <img src="https://hebo.ai/assets/hebo-platform-Cwx3imlO.png" alt="Hebo observability dashboard" width="800" />
</p>

## Get started

### Hebo Cloud

Sign up at [console.hebo.ai](https://console.hebo.ai/) and start sending requests through the gateway — no infrastructure needed.

```typescript
import OpenAI from "openai";

const hebo = new OpenAI({
  baseURL: "https://gateway.hebo.ai/v1",
  apiKey: process.env.HEBO_API_KEY,
});

const chat = await hebo.chat.completions.create({
  model: "claude-sonnet-4-5",
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "What is the Hebo gateway?" },
  ],
});
```

### Self-hosted

Run everything locally with Docker Compose — a single container with all services included.

```bash
cd infra/self-hosted
docker compose up -d
```

Open `http://localhost:8520` to access the console.

#### Production configuration

Create a `.env` file in `infra/self-hosted/` and set the variables you want to override. At minimum for production:

| Variable                                 | Why                                                              |
| ---------------------------------------- | ---------------------------------------------------------------- |
| `AUTH_SECRET`                            | Replace the default with a strong random string                  |
| `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, … | Platform-wide LLM provider keys (users can also bring their own) |

Optional: OAuth (`GITHUB_CLIENT_ID`, `GOOGLE_CLIENT_ID`, …) and SMTP (`SMTP_HOST`, `SMTP_PORT`, …) for passwordless login and invitations.

See [`infra/self-hosted/.env.example`](infra/self-hosted/.env.example) for the full variable reference.

## How Hebo compares

|                 | Hebo              | Langfuse          | Helicone          | Portkey       | LiteLLM     | OpenRouter | Vercel AI  |
| --------------- | ----------------- | ----------------- | ----------------- | ------------- | ----------- | ---------- | ---------- |
| Gateway         | Stateful\*        | —                 | Stateless         | Stateless     | Stateless   | Stateless  | Stateless  |
| Observability   | Conversation view | Request level     | Request level     | Request level | 3rd party   | 3rd party  | 3rd party  |
| Evaluations     | Simple Markdown   | Yes               | Via integrations  | Yes           | —           | —          | —          |
| User experience | Dev & Business    | Dev-focused       | Dev-focused       | Dev-focused   | Dev-focused | API only   | API only   |
| Deployment      | Cloud & self-host | Cloud & self-host | Cloud & self-host | Cloud only    | Self-host   | Cloud only | Cloud only |

\* Stateful: Hebo supports `/responses` and `/conversations` endpoints, enabling multi-turn sessions and persistent conversation history without managing state in your application.

## Community

- [Discord](https://discord.com/invite/cCJtXZRU5p) — ask questions, share feedback
- [X (@heboai)](https://x.com/heboai) — follow for updates
- [Docs](https://hebo.ai/docs) — guides and API reference
- [Blog](https://hebo.ai/blog) — product updates, guides, and research notes

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, architecture, and guidelines.
