import { describe, expect, it } from "bun:test";

import { Elysia } from "elysia";

import { getLogger } from "../lib/logger";
import { logging } from "./logging";

describe("logging middleware", () => {
  it("decorates logger for downstream plugins", async () => {
    const app = new Elysia().use(logging(getLogger("test"))).get("/", ({ logger }) => {
      logger.info("test");
      return "ok";
    });

    const res = await app.handle(new Request("http://localhost/"));
    expect(res.status).toBe(200);
  });
});
