import { describe, expect, it, mock } from "bun:test";

import { Elysia } from "elysia";

import type { Logger } from "../lib/logger";
import { auth } from "./auth";
import { logging } from "./logging";

const createMockLogger = (): Logger => ({
  trace: mock(() => {}),
  debug: mock(() => {}),
  info: mock(() => {}),
  warn: mock(() => {}),
  error: mock(() => {}),
});

describe("logging middleware", () => {
  it("decorates a working logger for downstream route handlers", async () => {
    const mockLogger = createMockLogger();
    const app = new Elysia().use(logging(mockLogger)).get("/", ({ logger }) => {
      logger.info("hello from handler");
      return "ok";
    });

    const res = await app.handle(new Request("http://localhost/"));
    expect(res.status).toBe(200);
    expect(mockLogger.info).toHaveBeenCalledWith("hello from handler");
  });

  it("propagates the real logger to the auth plugin", async () => {
    const mockLogger = createMockLogger();
    const app = new Elysia()
      .use(logging(mockLogger))
      .use(auth)
      .get("/protected", () => "secret", { isSignedIn: true });

    const res = await app.handle(new Request("http://localhost/protected"));
    expect(res.status).toBe(401);
    expect(mockLogger.info).toHaveBeenCalledWith(
      "Authentication failed or no credentials provided",
    );
  });

  it("crashes when auth runs without a real logger", async () => {
    const app = new Elysia().use(auth).get("/protected", () => "secret", { isSignedIn: true });

    const res = await app.handle(new Request("http://localhost/protected"));
    expect(res.status).toBe(500);
  });
});
