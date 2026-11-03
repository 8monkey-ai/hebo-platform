import { describe, expect, it, mock } from "bun:test";

import { Elysia } from "elysia";

const getSpans = mock(() => Promise.resolve([]));

void mock.module(`${import.meta.dir}/service.ts`, () => ({
  getSpans,
  listTraces: mock(),
}));

void mock.module(`${import.meta.dir}/../../middlewares/greptime.ts`, () => ({
  greptime: new Elysia({ name: "greptime-db" })
    .resolve(() => ({ greptimeDb: {}, organizationId: "org" }))
    .as("scoped"),
}));

const { spansModule } = await import(".");

describe("GET /agents/:agentSlug/branches/:branchSlug/traces/:traceId", () => {
  it("returns 404 when the trace does not exist", async () => {
    const response = await new Elysia()
      .use(spansModule)
      .handle(new Request("http://localhost/agents/agent/branches/main/traces/missing"));

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Trace not found");
  });
});
