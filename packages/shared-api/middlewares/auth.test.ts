import { describe, expect, it } from "bun:test";

import { Elysia } from "elysia";

import { getLogger } from "../lib/logger";
import { auth } from "./auth";
import { logging } from "./logging";

describe("auth middleware", () => {
  const app = new Elysia()
    .use(logging(getLogger("test")))
    .use(auth)
    .get("/protected", () => "secret", { isSignedIn: true });

  it("returns 401 for unauthenticated request on protected route", async () => {
    const res = await app.handle(new Request("http://localhost/protected"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when both cookie and authorization are provided", async () => {
    const res = await app.handle(
      new Request("http://localhost/protected", {
        headers: { cookie: "session=x", authorization: "Bearer key" },
      }),
    );
    expect(res.status).toBe(400);
  });
});
