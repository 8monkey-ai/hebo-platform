# Hebo MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for quick experimentation when implementing MCP clients. The `/aikit` endpoint provides a stateless MCP server that exposes sample tools you can use to test your MCP client implementations.

## Overview

This server uses the official [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk) and exposes a sample tool (`count_letters`) that you can use to test MCP client implementations in any language.

The server is available at `https://mcp.hebo.ai/aikit`.

> **Note:** This server is built with Elysia and includes a custom transport adapter (`mcp-transport.ts`) that bridges Elysia's request/response model with MCP's Streamable HTTP transport.

## Usage

### Using the JS MCP SDK

Here's an example client using the official MCP TypeScript SDK:

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

async function main() {
  const transport = new StreamableHTTPClientTransport(
    new URL("https://mcp.hebo.ai/aikit"),
    {
      fetch: globalThis.fetch,
    },
  );

  const client = new Client(
    {
      name: "hebo-client",
      version: "1.0.0",
    },
    {
      capabilities: {},
    },
  );

  await client.connect(transport);

  try {
    const result = await client.callTool({
      name: "count_letters",
      arguments: {
        word: "strawberry",
        letters: "r",
      },
    });

    console.log("Result:", result.content[0].text);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
```

### Using cURL (Direct HTTP)

You can also interact with the server directly using HTTP requests:

```bash
curl -X POST https://mcp.hebo.ai/aikit \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "count_letters",
      "arguments": {
        "word": "strawberry",
        "letters": "r"
      }
    }
  }'
```

### Using the Python MCP SDK

Here's an example client using the official [Python MCP SDK](https://github.com/modelcontextprotocol/python-sdk):

```python
import asyncio
from mcp import ClientSession, types
from mcp.client.streamable_http import streamablehttp_client

async def main():
    async with streamablehttp_client("https://mcp.hebo.ai/aikit") as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()

            result = await session.call_tool(
                "count_letters",
                {
                    "word": "strawberry",
                    "letters": "r",
                }
            )

            # Print the text content from the result
            for content in result.content:
                if isinstance(content, types.TextContent):
                    print(content.text)

if __name__ == "__main__":
    asyncio.run(main())
```

First, install the SDK:

```bash
pip install mcp
```
