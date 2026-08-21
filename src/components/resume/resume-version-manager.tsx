"use client";

import { CopyPlus, FileText, Lock, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  versionEvidence,
  type ResumeVersion,
} from "@/modules/resume-kitchen/versions";
import {
  createResumeRevision,
  getActiveResumeVersion,
  setActiveResumeVersion,
  updateResumeVersion,
  type WorkspaceSnapshot,
} from "@/modules/workspace/repository";
import { ResumeScore } from "./resume-score";

export function ResumeVersionManager({
  workspace,
}: {
  workspace: WorkspaceSnapshot;
}) {
  const active = getActiveResumeVersion(workspace);
  if (!active) return null;
  return (
    <VersionManagerContent
      key={active.id}
      workspace={workspace}
      active={active}
    />
  );
}

function VersionManagerContent({
  workspace,
  active,
}: {
  workspace: WorkspaceSnapshot;
  active: ResumeVersion;
}) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [name, setName] = useState(active.name);
  const [headline, setHeadline] = useState(active.headline);
  const [skills, setSkills] = useState(active.skills);
  const [items, setItems] = useState(active.items);

  const dirty = useMemo(
    () =>
      name.trim() !== active.name ||
      headline.trim() !== active.headline ||
      JSON.stringify(skills) !== JSON.stringify(active.skills) ||
      JSON.stringify(items) !== JSON.stringify(active.items),
    [active, headline, items, name, skills],
  );

  function create() {
    const nextName = newName.trim();
    if (!nextName) return;
    createResumeRevision(
      localStorage,
      active.id,
      nextName,
      workspace.activeApplicationId ?? undefined,
    );
    setCreating(false);
    setNewName("");
  }

  function save() {
    updateResumeVersion(localStorage, active.id, {
      name: name.trim(),
      ...(active.kind === "revision"
        ? { headline: headline.trim(), skills, items }
        : {}),
    });
  }

  const scoreEvidence = versionEvidence({ ...active, items });
  const skillCount = skills.reduce(
    (count, group) => count + group.skills.length,
    0,
  );

  return (
    <section className="backstage-card overflow-hidden rounded-[26px]">
      <div className="border-iron/70 flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="text-copper size-4" />
            <p className="font-semibold">Your résumé versions</p>
          </div>
          <p className="text-dust mt-1 text-xs leading-5">
            The original is locked. Every revision is a separately named copy
            you can change without losing where it came from.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating((value) => !value)}
          className="bg-amber text-night inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold"
        >
          <CopyPlus className="size-3.5" /> New named version
        </button>
      </div>

      {creating && (
        <div className="border-iron/60 bg-copper/[.035] flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-end">
          <label className="block min-w-0 flex-1">
            <span className="text-dust text-[10px] font-semibold uppercase">
              Version name
            </span>
            <input
              autoFocus
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && create()}
              placeholder="Acme backend application"
              maxLength={120}
              className="border-iron bg-night/50 text-canvas mt-1.5 w-full rounded-lg border px-3 py-2 text-sm outline-none"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={create}
              disabled={!newName.trim()}
              className="bg-copper text-night min-h-9 rounded-lg px-3 text-xs font-semibold disabled:opacity-40"
            >
              Create copy
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="text-dust min-h-9 px-2 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-5 p-5 xl:grid-cols-[1.45fr_.55fr]">
        <div>
          <div className="grid gap-3 sm:grid-cols-[14rem_1fr_auto] sm:items-end">
            <label>
              <span className="text-dust text-[10px] font-semibold uppercase">
                Open version
              </span>
              <select
                value={active.id}
                onChange={(event) =>
                  setActiveResumeVersion(localStorage, event.target.value)
                }
                className="border-iron bg-night/50 text-canvas mt-1.5 w-full rounded-lg border px-3 py-2 text-xs outline-none"
              >
                {workspace.resumeVersions.map((version) => (
                  <option key={version.id} value={version.id}>
                    {version.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-dust text-[10px] font-semibold uppercase">
                Name
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={120}
                className="border-iron bg-night/50 text-canvas mt-1.5 w-full rounded-lg border px-3 py-2 text-xs outline-none"
              />
            </label>
            <button
              type="button"
              onClick={save}
              disabled={!dirty || !name.trim()}
              className="border-iron text-canvas inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold disabled:opacity-35"
            >
              <Save className="size-3.5" /> Save
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span
              className={cn(
                "rounded-full border px-2 py-1 text-[9px] font-semibold uppercase",
                active.kind === "original"
                  ? "border-sage/40 text-sage"
                  : "border-copper/40 text-copper",
              )}
            >
              {active.kind}
            </span>
            {active.kind === "original" && (
              <span className="text-dust flex items-center gap-1 text-[10px]">
                <Lock className="size-2.5" /> Content locked
              </span>
            )}
          </div>

          <div className="border-iron/60 mt-5 grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
            <div>
              <p className="text-dust text-[10px] font-semibold uppercase">
                Headline
              </p>
              {active.kind === "revision" ? (
                <input
                  value={headline}
                  onChange={(event) => setHeadline(event.target.value)}
                  maxLength={200}
                  className="border-iron bg-night/45 text-canvas mt-1.5 w-full rounded-lg border px-3 py-2 text-xs outline-none"
                />
              ) : (
                <p className="text-canvas mt-1.5 text-xs leading-5">
                  {headline || "No headline in this résumé"}
                </p>
              )}
            </div>
            <div>
              <p className="text-dust text-[10px] font-semibold uppercase">
                Skills
              </p>
              <div className="mt-1.5 space-y-2">
                {skills.map((group, index) => (
                  <div key={`${group.category}-${index}`}>
                    <p className="text-dust text-[9px]">{group.category}</p>
                    {active.kind === "revision" ? (
                      <input
                        value={group.skills.join(", ")}
                        onChange={(event) =>
                          setSkills((current) =>
                            current.map((currentGroup, currentIndex) =>
                              currentIndex === index
                                ? {
                                    ...currentGroup,
                                    skills: event.target.value
                                      .split(",")
                                      .map((skill) => skill.trim())
                                      .filter(Boolean),
                                  }
                                : currentGroup,
                            ),
                          )
                        }
                        aria-label={`${group.category} skills`}
                        className="border-iron bg-night/45 text-canvas mt-1 w-full rounded-lg border px-3 py-2 text-xs outline-none"
                      />
                    ) : (
                      <p className="text-canvas mt-0.5 text-xs leading-5">
                        {group.skills.join(" · ")}
                      </p>
                    )}
                  </div>
                ))}
                {!skills.length && (
                  <p className="text-dust text-xs">No skills in this résumé</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {items.map((item) => (
              <article
                key={item.id}
                className="border-iron/60 rounded-xl border p-4"
              >
                <p className="text-sm font-semibold">{item.title}</p>
                {item.organization && (
                  <p className="text-dust mt-0.5 text-[10px]">
                    {item.organization}
                  </p>
                )}
                <div className="mt-3 space-y-2">
                  {item.bullets.map((bullet) => (
                    <div key={bullet.id} className="flex items-start gap-2">
                      {active.kind === "revision" ? (
                        <textarea
                          value={bullet.content}
                          rows={2}
                          onChange={(event) =>
                            setItems((current) =>
                              current.map((currentItem) =>
                                currentItem.id === item.id
                                  ? {
                                      ...currentItem,
                                      bullets: currentItem.bullets.map(
                                        (currentBullet) =>
                                          currentBullet.id === bullet.id
                                            ? {
                                                ...currentBullet,
                                                content: event.target.value,
                                              }
                                            : currentBullet,
                                      ),
                                    }
                                  : currentItem,
                              ),
                            )
                          }
                          className="border-iron bg-night/45 text-canvas min-h-16 flex-1 resize-y rounded-lg border p-2.5 text-xs leading-5 outline-none"
                        />
                      ) : (
                        <p className="text-canvas flex-1 text-xs leading-5">
                          · {bullet.content}
                        </p>
                      )}
                      {active.kind === "revision" && (
                        <button
                          type="button"
                          onClick={() =>
                            setItems((current) =>
                              current.map((currentItem) =>
                                currentItem.id === item.id
                                  ? {
                                      ...currentItem,
                                      bullets: currentItem.bullets.filter(
                                        (candidate) =>
                                          candidate.id !== bullet.id,
                                      ),
                                    }
                                  : currentItem,
                              ),
                            )
                          }
                          aria-label="Remove bullet from this version"
                          className="text-dust hover:text-canvas mt-2 shrink-0"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>

        <ResumeScore evidence={scoreEvidence} skillCount={skillCount} />
      </div>
    </section>
  );
}
