/**
 * Turns a candidate's name into the address their portfolio lives at.
 *
 * Derived rather than chosen: picking a handle is friction at exactly the
 * moment someone has finished the work and wants to see the result, and their
 * name is already what a recruiter is looking for.
 *
 * Pure, so collision behaviour is testable without a database.
 */

/**
 * Paths the app already serves, plus ones it plausibly will.
 *
 * Portfolios are namespaced under /p, so none of these collide today. Handles
 * outlive their URL scheme though, and one that could never be promoted to a
 * top-level path is worth avoiding now rather than migrating later.
 */
export const RESERVED_HANDLES = new Set([
  "about",
  "admin",
  "api",
  "app",
  "auth",
  "billing",
  "blog",
  "contact",
  "dashboard",
  "docs",
  "guru",
  "help",
  "home",
  "login",
  "logout",
  "new",
  "onboarding",
  "p",
  "pricing",
  "privacy",
  "settings",
  "signup",
  "support",
  "terms",
  "user",
  "www",
]);

const MIN_LENGTH = 3;
const MAX_LENGTH = 40;

/**
 * A name reduced to a URL-safe slug.
 *
 * Accents are folded rather than dropped, so "Jose Alvarez" written with them
 * still becomes "jose-alvarez". A name mangled into nonsense is worse than no
 * portfolio at all.
 */
export function deriveHandle(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/['’]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_LENGTH)
    .replace(/-+$/g, "");
}

export function isUsableHandle(handle: string): boolean {
  return (
    handle.length >= MIN_LENGTH &&
    handle.length <= MAX_LENGTH &&
    /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(handle) &&
    !RESERVED_HANDLES.has(handle)
  );
}

/**
 * The first handle nobody else holds.
 *
 * Suffixes count up rather than using random characters, because this URL gets
 * pasted into applications and read aloud. "jane-okonkwo-2" survives that;
 * "jane-okonkwo-f3a9" does not.
 */
export function resolveHandle(
  name: string,
  isTaken: (handle: string) => boolean,
  limit = 50,
): string | null {
  const base = deriveHandle(name);
  if (!base) return null;

  if (isUsableHandle(base) && !isTaken(base)) return base;

  const stem = base.slice(0, MAX_LENGTH - 4).replace(/-+$/g, "");
  for (let suffix = 2; suffix <= limit; suffix += 1) {
    const candidate = `${stem}-${suffix}`;
    if (isUsableHandle(candidate) && !isTaken(candidate)) return candidate;
  }
  return null;
}
