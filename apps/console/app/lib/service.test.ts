import { beforeEach, describe, expect, it, mock } from "bun:test";

import { HTTPError, NetworkError } from "ky";

const ensureSignedIn = mock(() => Promise.resolve(true));
await mock.module("./auth", () => ({ authService: { ensureSignedIn } }));
await mock.module("./env", () => ({
  apiUrl: "https://api.test",
  gatewayUrl: "https://gateway.test",
}));

const { kyFetch } = await import("./service");
const { parseError } = await import("./errors");

beforeEach(() => {
  ensureSignedIn.mockResolvedValue(true);
});

describe("kyFetch", () => {
  it.each([400, 404, 409, 422])("returns application errors with status %s", async (status) => {
    const response = await kyFetch("https://api.test/resource", {
      fetch: () => Promise.resolve(Response.json({ message: "Invalid input" }, { status })),
    });
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ message: "Invalid input" });
  });

  it("retries server failures before returning a successful response", async () => {
    const fetch = mock(() =>
      Promise.resolve(Response.json({ message: "Unavailable" }, { status: 503 })),
    );
    fetch.mockResolvedValueOnce(Response.json({ message: "Unavailable" }, { status: 503 }));
    fetch.mockResolvedValueOnce(Response.json({ ok: true }));
    const result = await kyFetch("https://api.test/resource", {
      fetch,
      retry: { limit: 1, delay: () => 0 },
    }).json();
    expect(result).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("preserves structured API error messages and stacks", async () => {
    const request = kyFetch("https://api.test/resource", {
      fetch: () =>
        Promise.resolve(
          Response.json(
            { error: { message: "Quota exceeded" }, stack: "api stack" },
            { status: 403 },
          ),
        ),
      retry: 0,
    });
    const error = await request.catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(HTTPError);
    expect((error as HTTPError).message).toBe("Quota exceeded");
    expect((error as HTTPError).stack).toBe("api stack");
    expect(parseError(error).status).toBe(403);
  });

  it("preserves empty responses for Eden to handle", async () => {
    const response = await kyFetch("https://api.test/resource", {
      fetch: () => Promise.resolve(new Response(null, { status: 204 })),
    });
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });

  it("does not send a request after the session expires", async () => {
    ensureSignedIn.mockResolvedValue(false);
    const fetch = mock(() => Promise.resolve(Response.json({ ok: true })));
    const error = await kyFetch("https://api.test/resource", { fetch }).catch(
      (cause: unknown) => cause,
    );
    expect(error).toHaveProperty("name", "AbortError");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("marks Ky network errors as retryable", () => {
    const error = new NetworkError(new Request("https://api.test/resource"));
    expect(parseError(error).retryable).toBe(true);
    expect(parseError(error).message).toStartWith("Network error:");
  });
});
