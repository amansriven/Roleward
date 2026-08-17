/**
 * Address classification for the job-posting fetcher. Kept free of `server-only`
 * so the guard rules stay directly testable.
 */

export function ipv4Blocked(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part)))
    return true;
  const [a, b] = parts as [number, number, number, number];
  if (a < 0 || a > 255 || b < 0 || b > 255) return true;
  if (a === 0 || a === 127 || a === 10) return true;
  if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true; // multicast and reserved
  return false;
}

export function ipv6Blocked(address: string) {
  const value = address.toLowerCase().split("%")[0] ?? "";
  if (value === "::" || value === "::1") return true;
  const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped?.[1]) return ipv4Blocked(mapped[1]);
  if (/^f[cd][0-9a-f]{2}:/.test(value)) return true; // unique local
  if (/^fe[89ab][0-9a-f]:/.test(value)) return true; // link-local
  return false;
}

export function addressBlocked(address: string, family: number) {
  return family === 4 ? ipv4Blocked(address) : ipv6Blocked(address);
}
