import {
  loadWorkspace,
  updateResumeVersion,
} from "@/modules/workspace/repository";

export interface MoxieDraftTarget {
  bulletId: string;
  versionId: string;
  versionName: string;
  currentContent: string;
}

export interface MoxieDraftApplication extends MoxieDraftTarget {
  previousContent: string;
}

function locate(bulletId: string) {
  const workspace = loadWorkspace(localStorage);
  for (const version of workspace.resumeVersions) {
    for (const item of version.items) {
      const bullet = item.bullets.find((entry) => entry.id === bulletId);
      if (bullet) return { workspace, version, item, bullet };
    }
  }
  return null;
}

/** Resolves the bullet a draft names, or null when it no longer exists. */
export function findMoxieDraftTarget(
  bulletId: string,
): MoxieDraftTarget | null {
  const found = locate(bulletId);
  if (!found) return null;
  return {
    bulletId,
    versionId: found.version.id,
    versionName: found.version.name,
    currentContent: found.bullet.content,
  };
}

/**
 * Rewrites one bullet's wording in place. `sourceClaimIds` are carried over
 * untouched, so an applied draft stays tied to the confirmed evidence the
 * original bullet rested on and cannot introduce an unbacked claim.
 */
export function applyMoxieDraftBullet(
  bulletId: string,
  content: string,
): MoxieDraftApplication {
  const found = locate(bulletId);
  if (!found) throw new Error("That resume bullet no longer exists");
  const previousContent = found.bullet.content;
  updateResumeVersion(localStorage, found.version.id, {
    items: found.version.items.map((item) =>
      item.id === found.item.id
        ? {
            ...item,
            bullets: item.bullets.map((entry) =>
              entry.id === bulletId ? { ...entry, content } : entry,
            ),
          }
        : item,
    ),
  });
  return {
    bulletId,
    versionId: found.version.id,
    versionName: found.version.name,
    currentContent: content,
    previousContent,
  };
}
