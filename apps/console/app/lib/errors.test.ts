import { describe, expect, test } from "bun:test";

import { createMemoryRouter, redirect } from "react-router";

import { parseError, revalidateOnSuccessfulAction } from "./errors";

describe("parseError", () => {
  test("recognizes native fetch network errors without treating other TypeErrors as network failures", () => {
    expect(parseError(new TypeError("Failed to fetch"))).toMatchObject({
      message: "Network error: Failed to fetch",
      retryable: true,
    });
    expect(parseError(new TypeError("Cannot read properties of undefined"))).toMatchObject({
      message: "Cannot read properties of undefined",
      retryable: false,
    });
  });
});

describe("revalidateOnSuccessfulAction", () => {
  test("reloads the parent after an action redirects", async () => {
    let loads = 0;
    const router = createMemoryRouter(
      [
        {
          path: "/",
          loader: () => ++loads,
          shouldRevalidate: revalidateOnSuccessfulAction,
          children: [{ path: "create", action: () => redirect("/agent") }, { path: "agent" }],
        },
      ],
      { initialEntries: ["/create"] },
    );

    await new Promise<void>((resolve) => {
      if (router.state.initialized) resolve();
      else
        router.subscribe((state) => {
          if (state.initialized) resolve();
        });
    });
    await router.navigate("/create", { formMethod: "post", formData: new FormData() });

    expect(router.state.location.pathname).toBe("/agent");
    expect(loads).toBe(2);
    await router.navigate("/create");
    expect(loads).toBe(2);
    router.dispose();
  });
});
