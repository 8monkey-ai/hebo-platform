import { describe, expect, it } from "bun:test";

import { Elysia } from "elysia";

import { getLogger } from "../lib/logger";
import { auth } from "./auth";
import { logging } from "./logging";

function makeApp() {
  return new Elysia()
    .use(logging(getLogger("test")))
    .use(auth)
    .get("/protected", () => "secret", { isSignedIn: true })
    .get("/public", ({ userId }) => userId ?? "anonymous");
}

describe("auth middleware", () => {
  const app = makeApp();

  it("returns 401 for unauthenticated request on protected route", async () => {
    const res = await app.handle(new Request("http://localhost/protected"));
    expect(res.status).toBe(401);
  });

  it("resolves with no user on public route with no credentials", async () => {
    const res = await app.handle(new Request("http://localhost/public"));
    expect(res.status).toBe(200);
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

describe("auth middleware without logging plugin", () => {
  const app = new Elysia().use(auth).get("/public", ({ userId }) => userId ?? "anonymous");

  it("fails when logger placeholder is not overridden", async () => {
    const res = await app.handle(new Request("http://localhost/public"));
    expect(res.status).toBe(500);
  });
});
