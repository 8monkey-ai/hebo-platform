🐵 Hebo Aikit MCP server says hello!

1. # Discover available tools

```bash Shell
curl -X POST "https://mcp.hebo.ai/aikit/" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "params": {},
    "id": 1
  }'
```

2. # Provide them to generate text

```javascript Vercel AI SDK
import { experimental_createMCPClient as createMCPClient } from "@ai-sdk/mcp";

const mcpClient = await createMCPClient({
  transport: {
    type: "http",
    url: "https://mcp.hebo.ai/aikit/",
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
});
```

3. # Go deeper with any AI SDK

- [Vercel AI SDK](https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools)
- [Popular MCP Client](https://www.npmjs.com/package/mcp-client)
- [Official MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/client.md)

(hebo.ai is designed, built and backed by Infinite Monkey AI)
