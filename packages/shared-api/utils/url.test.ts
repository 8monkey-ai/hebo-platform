import { describe, expect, it } from "bun:test";

import { getRootDomain } from "./url";

describe("getRootDomain", () => {
  it.each([
    [undefined, undefined],
    ["http://localhost", undefined],
    ["https://hebo.ai", "hebo.ai"],
    ["https://api.hebo.ai", "hebo.ai"],
    ["https://api.example.co.uk", "example.co.uk"],
    ["http://203.0.113.7", "203.0.113.7"],
    ["https://203.0.113.7.sslip.io", "203.0.113.7.sslip.io"],
    ["https://api.203.0.113.7.sslip.io", "203.0.113.7.sslip.io"],
    ["https://api.203-0-113-7.sslip.io", "203-0-113-7.sslip.io"],
    ["https://api-203-0-113-7.sslip.io", "api-203-0-113-7.sslip.io"],
    ["https://auth.cb00710d.nip.io", "cb00710d.nip.io"],
    ["https://gateway.10.0.0.1.traefik.me:8443", "10.0.0.1.traefik.me"],
  ])("%s -> %s", (baseUrl, expected) => {
    expect(getRootDomain(baseUrl)).toBe(expected);
  });
});
