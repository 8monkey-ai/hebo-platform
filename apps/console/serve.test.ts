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

  it("derives magic-link auth from SMTP_HOST unless explicitly set", () => {
    expect(injectRuntimeEnv(html, { SMTP_HOST: "smtp.example.com" })).toContain(
      'window.heboEnv={"VITE_MAGICLINK_AUTH":"true"}</script>',
    );
    expect(
      injectRuntimeEnv(html, {
        SMTP_HOST: "smtp.example.com",
        VITE_MAGICLINK_AUTH: "false",
      }),
    ).toContain('window.heboEnv={"VITE_MAGICLINK_AUTH":"false"}</script>');
  });

  it("omits non-VITE, unset, and empty values so build-time defaults still apply", () => {
    expect(
      injectRuntimeEnv(html, { VITE_API_URL: "", VITE_AUTH_URL: undefined, PATH: "/usr/bin" }),
    ).toContain("window.heboEnv={}</script>");
  });
});
