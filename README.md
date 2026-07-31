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

## Supported providers

Anthropic, OpenAI, Amazon Bedrock, Google Vertex, Microsoft Azure, DeepSeek, xAI, Alibaba (Qwen), MiniMax, Z.ai (Zhipu), Moonshot, Fireworks, DeepInfra, Together AI, Chutes, Groq, and Voyage.

All providers support BYOK (Bring Your Own Key). Platform-level keys are optional — users can configure their own credentials per organization.

Browse the full model catalog: [gateway.hebo.ai/v1/models](https://gateway.hebo.ai/v1/models)

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

#### Custom domains

The console is a static SPA, so the API, Auth and Gateway URLs are compiled into its bundle at build time. The published image is built without them and falls back to `localhost`, which means **serving the console from your own domain requires building your own image** from a checkout of this repository.

Set the URLs in `infra/self-hosted/.env`:

```bash
VITE_API_URL=https://api.example.com
VITE_AUTH_URL=https://auth.example.com
VITE_GATEWAY_URL=https://gateway.example.com

BASE_URL=https://auth.example.com
NODE_ENV=production
```

Then build and start:

```bash
cd infra/self-hosted
docker compose -f docker-compose.yaml -f docker-compose.build.yaml up -d --build
```

`BASE_URL` configures the server side: CORS, the auth base URL, trusted origins and the session cookie domain. Point it at your **auth** host — all services share one `BASE_URL` in standalone mode, and auth is the only one that uses it literally, deriving OAuth callbacks as `${BASE_URL}/v1/callback/<provider>` (register that with each provider). The console and the services must share a registrable domain (`example.com` above), the console must be on a subdomain rather than the apex, and every origin must be `https://`.

One side effect: the API and Gateway build the `servers` URL in their OpenAPI documents from `BASE_URL`, so it will name the auth host. That affects generated client defaults, not live traffic.

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
