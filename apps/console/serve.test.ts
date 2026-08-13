import { describe, expect, it } from "bun:test";

import { injectRuntimeEnv } from "./serve";

const html = "<html><head><title>Hebo</title></head><body></body></html>";

describe("injectRuntimeEnv", () => {
  it("inlines every set VITE_ var before the app bundle", () => {
    expect(
      injectRuntimeEnv(html, { VITE_API_URL: "https://api.example.com", VITE_ANYTHING: "on" }),
    ).toContain(
      `<head><script>window.heboEnv={"VITE_API_URL":"https://api.example.com","VITE_ANYTHING":"on"}</script>`,
    );
  });

  it("omits non-VITE, unset, and empty values so build-time defaults still apply", () => {
    expect(
      injectRuntimeEnv(html, { VITE_API_URL: "", VITE_AUTH_URL: undefined, PATH: "/usr/bin" }),
    ).toContain("window.heboEnv={}</script>");
  });

  it("escapes < so a value cannot close the script tag", () => {
    const out = injectRuntimeEnv(html, { VITE_API_URL: "</script><script>alert(1)</script>" });

    expect(out).not.toContain("</script><script>alert(1)");
    expect(out.match(/<script>/gu)).toHaveLength(1);
  });
});
