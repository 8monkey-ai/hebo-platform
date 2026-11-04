import { describe, expect, test } from "bun:test";

import { getRootDomain } from "./url";

describe("getRootDomain", () => {
  test.each([
    // no restriction
    [undefined, undefined],
    ["http://localhost", undefined],
    ["http://localhost:8520", undefined],
    ["http://app.localhost", undefined],
    // regular domains
    ["https://hebo.ai", "hebo.ai"],
    ["https://api.hebo.ai", "hebo.ai"],
    ["https://api.staging.hebo.ai:8443/path", "hebo.ai"],
    // ccTLD registry second levels
    ["https://example.co.uk", "example.co.uk"],
    ["https://api.example.co.uk", "example.co.uk"],
    ["https://api.example.com.au", "example.com.au"],
    ["https://api.co.example.com", "example.com"],
    // IP addresses
    ["https://1.2.3.4", "1.2.3.4"],
    ["https://1.2.3.4:8520", "1.2.3.4"],
    ["https://[::1]:8520", "[::1]"],
    // IP wildcard DNS
    ["https://api.1.2.3.4.sslip.io", "1.2.3.4.sslip.io"],
    ["https://1.2.3.4.sslip.io", "1.2.3.4.sslip.io"],
    ["https://a.b.10.0.0.1.nip.io", "10.0.0.1.nip.io"],
    ["https://api.1-2-3-4.sslip.io", "1-2-3-4.sslip.io"],
    ["https://api-1-2-3-4.sslip.io", "api-1-2-3-4.sslip.io"],
    ["https://api.10.0.0.1.traefik.me", "10.0.0.1.traefik.me"],
    // shared PaaS hosts
    ["https://hebo.vercel.app", "hebo.vercel.app"],
    ["https://api.hebo.fly.dev", "hebo.fly.dev"],
    ["https://hebo.up.railway.app", "hebo.up.railway.app"],
    // single label
    ["http://hebo:8520", "hebo"],
  ])("%p → %p", (baseUrl, expected) => {
    expect(getRootDomain(baseUrl)).toBe(expected);
  });
});
