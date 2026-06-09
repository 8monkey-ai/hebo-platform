import { describe, expect, test } from "bun:test";

import { acpModule } from "./acp";

describe("acpModule", () => {
  test("exports an Elysia instance", () => {
    expect(acpModule).toBeDefined();
    expect(acpModule.handle).toBeFunction();
  });
});
