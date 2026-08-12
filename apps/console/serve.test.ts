import { describe, expect, it } from "bun:test";

import { injectRuntimeEnv } from "./serve";

const html = "<html><head><title>Hebo</title></head><body></body></html>";

const injected = (env: Record<string, string | undefined>): Record<string, string> =>
  JSON.parse(
    injectRuntimeEnv(html, env).match(/window\.heboEnv=(.*?)<\/script>/u)?.[1] ?? "null",
  ) as Record<string, string>;

describe("injectRuntimeEnv", () => {
  it("inlines set values before the app bundle", () => {
    const out = injectRuntimeEnv(html, { VITE_API_URL: "https://api.example.com" });

    expect(out).toContain(`<head><script>window.heboEnv=`);
    expect(out.indexOf("heboEnv")).toBeLessThan(out.indexOf("<title>"));
    expect(injected({ VITE_API_URL: "https://api.example.com" })).toEqual({
      VITE_API_URL: "https://api.example.com",
    });
  });

  it("omits unset and empty values so build-time defaults still apply", () => {
    expect(injected({ VITE_API_URL: "", VITE_AUTH_URL: undefined, PATH: "/usr/bin" })).toEqual({});
  });

  it("escapes < so a value cannot close the script tag", () => {
    const out = injectRuntimeEnv(html, { VITE_API_URL: "</script><script>alert(1)</script>" });

    expect(out).not.toContain("</script><script>alert(1)");
    expect(out.match(/<script>/gu)).toHaveLength(1);
  });

  it("fails loudly rather than silently dropping config", () => {
    expect(() => injectRuntimeEnv("<html><body></body></html>", {})).toThrow(/no <head>/u);
  });
});
