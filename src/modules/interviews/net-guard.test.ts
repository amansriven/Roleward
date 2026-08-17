import { describe, expect, it } from "vitest";
import { addressBlocked, ipv4Blocked, ipv6Blocked } from "./net-guard";

describe("job-source address guard", () => {
  it("blocks the cloud metadata endpoint", () => {
    expect(ipv4Blocked("169.254.169.254")).toBe(true);
  });

  it("blocks loopback and private ranges", () => {
    for (const address of [
      "127.0.0.1",
      "10.1.2.3",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.1",
      "100.64.0.1",
      "0.0.0.0",
      "224.0.0.1",
    ])
      expect(ipv4Blocked(address), address).toBe(true);
  });

  it("allows ordinary public addresses", () => {
    for (const address of [
      "93.184.216.34",
      "8.8.8.8",
      "172.32.0.1",
      "13.107.42.14",
    ])
      expect(ipv4Blocked(address), address).toBe(false);
  });

  it("blocks malformed input rather than allowing it", () => {
    for (const address of ["", "1.2.3", "1.2.3.4.5", "a.b.c.d", "999.1.1.1"])
      expect(ipv4Blocked(address), address).toBe(true);
  });

  it("blocks IPv6 loopback, unique-local, and link-local", () => {
    for (const address of ["::1", "::", "fc00::1", "fd12:3456::1", "fe80::1"])
      expect(ipv6Blocked(address), address).toBe(true);
    expect(ipv6Blocked("2606:4700:4700::1111")).toBe(false);
  });

  it("unwraps IPv4-mapped IPv6 so it cannot smuggle a private address", () => {
    expect(ipv6Blocked("::ffff:169.254.169.254")).toBe(true);
    expect(ipv6Blocked("::ffff:127.0.0.1")).toBe(true);
    expect(ipv6Blocked("::ffff:93.184.216.34")).toBe(false);
  });

  it("dispatches on address family", () => {
    expect(addressBlocked("127.0.0.1", 4)).toBe(true);
    expect(addressBlocked("::1", 6)).toBe(true);
    expect(addressBlocked("8.8.8.8", 4)).toBe(false);
  });
});
