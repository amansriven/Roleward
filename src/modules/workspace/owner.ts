"use client";

/**
 * Every workspace key in localStorage is global to the browser, so a second
 * account signing in on the same browser would otherwise read — and, through
 * the migration merge, permanently adopt — the first account's data. The owner
 * stamp lets the sync pass detect that and wipe the previous account's keys
 * before anything is read.
 */
const ownerKey = "roleward:workspace-owner";
const workspacePrefix = "roleward:";
// Device preferences say nothing about the person, so they survive the reset.
const preservedKeys = new Set([
  ownerKey,
  "roleward:workspace-sidebar-collapsed",
  "roleward:moxie-history-open",
]);

export function clearLocalWorkspace(storage: Storage) {
  const doomed: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(workspacePrefix) && !preservedKeys.has(key))
      doomed.push(key);
  }
  for (const key of doomed) storage.removeItem(key);
}

/**
 * Point local storage at `owner`, clearing anything the previous account left
 * behind. Returns true when data was cleared.
 */
export function claimLocalWorkspace(
  storage: Storage,
  owner: string,
  { hasCloudWorkspace }: { hasCloudWorkspace: boolean },
) {
  const previous = storage.getItem(ownerKey);
  storage.setItem(ownerKey, owner);
  if (previous === owner) return false;
  // An unstamped workspace predates this check. It is only safe to keep as this
  // account's own unsynced data when the account has nothing in the cloud yet;
  // otherwise it is another account's leftovers and has to go.
  if (previous === null && !hasCloudWorkspace) return false;
  clearLocalWorkspace(storage);
  return true;
}
