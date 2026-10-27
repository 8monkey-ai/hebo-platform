import { describe, expect, test } from "bun:test";

import { createMemoryRouter, redirect } from "react-router";

import { revalidateOnSuccessfulAction } from "./errors";

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
