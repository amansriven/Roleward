"use client";

import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  Database,
  FolderKanban,
  GraduationCap,
  MapPin,
  Pencil,
  Search,
  Trash2,
  UsersRound,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { EvidenceItem } from "@/modules/evidence/schema";
import {
  loadWorkspace,
  saveEvidenceAndRefresh,
  workspaceUpdatedEvent,
  type WorkspaceSnapshot,
} from "@/modules/workspace/repository";

export type EvidenceLibraryView =
  | "overview"
  | "experience"
  | "projects"
  | "education"
  | "activities"
  | "skills";

type Filter = "all" | "confirmed" | "proposed";

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmed",
  corrected: "Edited and confirmed",
  proposed: "Needs review",
  rejected: "Rejected",
};

const sectionMeta: Record<
  Exclude<EvidenceLibraryView, "overview">,
  { eyebrow: string; title: string; copy: string }
> = {
  experience: {
    eyebrow: "Experience",
    title: "Roles and internships",
    copy: "Employers, role titles, dates, locations, and the complete bullets you wrote.",
  },
  projects: {
    eyebrow: "Projects",
    title: "Work you built",
    copy: "Each project stays separate, with its dates and original bullet boundaries intact.",
  },
  education: {
    eyebrow: "Education",
    title: "Schools and coursework",
    copy: "Degree, field of study, minor, GPA, coursework, honors, and graduation details live here—not in generic claim rows.",
  },
  activities: {
    eyebrow: "Activities",
    title: "Leadership and extracurriculars",
    copy: "Clubs, volunteering, campus roles, and leadership experience remain distinct from employment.",
  },
  skills: {
    eyebrow: "Skills",
    title: "Your technical toolkit",
    copy: "Skills stay grouped the same way they appeared on your résumé.",
  },
};

export function EvidenceLibrary({
  view = "overview",
}: {
  view?: EvidenceLibraryView;
}) {
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    const refresh = () => setWorkspace(loadWorkspace(localStorage));
    queueMicrotask(refresh);
    window.addEventListener(workspaceUpdatedEvent, refresh);
    return () => window.removeEventListener(workspaceUpdatedEvent, refresh);
  }, []);

  const items = useMemo(() => workspace?.evidence ?? [], [workspace?.evidence]);

  const usage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const application of workspace?.applications ?? [])
      for (const requirement of application.requirements)
        for (const claimId of requirement.supportingClaimIds)
          counts.set(claimId, (counts.get(claimId) ?? 0) + 1);
    return counts;
  }, [workspace?.applications]);

  const scoped = useMemo(() => {
    switch (view) {
      case "experience":
        return items.filter((item) => item.type === "experience");
      case "projects":
        return items.filter((item) => item.type === "project");
      case "education":
        return items.filter((item) => item.type === "education");
      case "activities":
        return items.filter((item) =>
          ["activity", "leadership", "other"].includes(item.type),
        );
      default:
        return items;
    }
  }, [items, view]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return scoped
      .map((item) => ({
        ...item,
        claims: item.claims.filter((claim) => {
          if (filter === "confirmed")
            return (
              claim.verificationStatus === "confirmed" ||
              claim.verificationStatus === "corrected"
            );
          if (filter === "proposed")
            return claim.verificationStatus === "proposed";
          return true;
        }),
      }))
      .filter((item) => {
        const hasStructuredEducation =
          item.type === "education" && Boolean(item.education);
        if (!needle) return item.claims.length > 0 || hasStructuredEducation;
        const haystack = [
          item.title,
          item.organization ?? "",
          item.period ?? "",
          item.location ?? "",
          item.summary,
          item.education?.degree ?? "",
          item.education?.fieldOfStudy ?? "",
          item.education?.minor ?? "",
          item.education?.gpa ?? "",
          ...(item.education?.coursework ?? []),
          ...(item.education?.honors ?? []),
          ...item.claims.map((claim) => claim.content),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(needle);
      });
  }, [scoped, query, filter]);

  function persist(next: EvidenceItem[]) {
    saveEvidenceAndRefresh(localStorage, next);
    setWorkspace(loadWorkspace(localStorage));
  }

  if (workspace === null)
    return (
      <div className="text-dust py-20 text-center text-sm">
        Opening your evidence…
      </div>
    );

  if (!items.length)
    return (
      <div className="border-iron/75 rounded-[22px] border py-20 text-center">
        <Database className="text-dust mx-auto size-6" />
        <h2 className="mt-5 text-xl font-semibold">No evidence yet.</h2>
        <p className="text-canvas mx-auto mt-2 max-w-md text-sm leading-6">
          Import a résumé, review what was read, and confirm only what is true.
        </p>
        <Link
          href="/dashboard/resume-kitchen/intake"
          className="bg-copper text-night mt-6 inline-flex rounded-lg px-4 py-2.5 text-sm font-semibold"
        >
          Import résumé
        </Link>
      </div>
    );

  if (view === "overview")
    return <EvidenceOverview workspace={workspace} items={items} />;

  const meta = sectionMeta[view];

  if (view === "skills")
    return (
      <div className="space-y-7">
        <SectionHeading {...meta} />
        <SkillsView groups={workspace.candidateSkills} />
      </div>
    );

  const claimCount = scoped.reduce(
    (count, item) => count + item.claims.length,
    0,
  );

  return (
    <div className="space-y-7">
      <SectionHeading {...meta} />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="border-iron flex flex-1 items-center gap-3 border-b px-1">
          <Search className="text-dust size-4 shrink-0" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${scoped.length} ${scoped.length === 1 ? "entry" : "entries"}`}
            aria-label={`Search ${meta.eyebrow.toLowerCase()}`}
            className="text-canvas placeholder:text-dust w-full bg-transparent py-3 text-sm outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="text-dust hover:text-canvas shrink-0"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        {claimCount > 0 && (
          <div className="border-iron flex shrink-0 items-center gap-5 border-b px-1">
            {(["all", "confirmed", "proposed"] as Filter[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                className={cn(
                  "relative py-3 text-xs font-medium capitalize transition",
                  filter === option
                    ? "text-linen after:bg-copper after:absolute after:inset-x-0 after:bottom-0 after:h-0.5"
                    : "text-dust hover:text-canvas",
                )}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <SectionEmpty view={view} query={query} />
      ) : (
        <div className="border-iron/75 divide-iron/75 divide-y border-y">
          {visible.map((item) => (
            <EvidenceRecord
              key={item.id}
              item={item}
              usage={usage}
              onChange={(next) =>
                persist(
                  items.map((entry) => (entry.id === item.id ? next : entry)),
                )
              }
              onDelete={() =>
                persist(items.filter((entry) => entry.id !== item.id))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EvidenceOverview({
  workspace,
  items,
}: {
  workspace: WorkspaceSnapshot;
  items: EvidenceItem[];
}) {
  const count = (types: EvidenceItem["type"][]) =>
    items.filter((item) => types.includes(item.type)).length;
  const claims = items.flatMap((item) => item.claims);
  const confirmed = claims.filter((claim) =>
    ["confirmed", "corrected"].includes(claim.verificationStatus),
  ).length;
  const skillCount = workspace.candidateSkills.reduce(
    (total, group) => total + group.skills.length,
    0,
  );

  const destinations = [
    {
      icon: BriefcaseBusiness,
      title: "Experience",
      copy: "Roles, employers, dates, locations, and intact bullets",
      count: count(["experience"]),
      href: "/dashboard/evidence/experience",
    },
    {
      icon: FolderKanban,
      title: "Projects",
      copy: "Projects separated from employment and coursework",
      count: count(["project"]),
      href: "/dashboard/evidence/projects",
    },
    {
      icon: GraduationCap,
      title: "Education",
      copy: "Schools, degrees, GPA, coursework, and honors",
      count: count(["education"]),
      href: "/dashboard/evidence/education",
    },
    {
      icon: UsersRound,
      title: "Activities",
      copy: "Leadership, clubs, volunteering, and extracurriculars",
      count: count(["activity", "leadership", "other"]),
      href: "/dashboard/evidence/activities",
    },
    {
      icon: Wrench,
      title: "Skills",
      copy: "Technical skills grouped as they appeared on your résumé",
      count: skillCount,
      href: "/dashboard/evidence/skills",
    },
  ] as const;

  return (
    <div className="space-y-9">
      <SectionHeading
        eyebrow="Overview"
        title="Your verified career record"
        copy="Evidence is organized like a résumé, so you can find and correct one kind of information at a time."
      />

      <section>
        <p className="section-label">At a glance</p>
        <div className="border-iron/75 divide-iron/75 mt-4 grid divide-y border-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Summary
            label="Entries"
            value={String(items.length)}
            note="Across your full résumé"
          />
          <Summary
            label="Confirmed bullets"
            value={`${confirmed} / ${claims.length}`}
            note={
              confirmed === claims.length
                ? "Everything reviewed"
                : "Review still needed"
            }
          />
          <Summary
            label="Skills"
            value={String(skillCount)}
            note="Kept in original groups"
          />
        </div>
      </section>

      <section>
        <p className="section-label">Browse your evidence</p>
        <div className="border-iron/75 divide-iron/75 mt-4 divide-y border-y">
          {destinations.map((destination) => (
            <EvidenceDestination key={destination.href} {...destination} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: string;
  copy: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="section-label">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-[-.035em] sm:text-3xl">
        {title}
      </h2>
      <p className="text-canvas mt-2 text-sm leading-6">{copy}</p>
    </div>
  );
}

function Summary({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="min-w-0 py-5 sm:px-6 sm:first:pl-0">
      <p className="text-dust text-[10px] tracking-[.08em] uppercase">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
      <p className="text-dust mt-1 text-xs">{note}</p>
    </div>
  );
}

function EvidenceDestination({
  icon: Icon,
  title,
  copy,
  count,
  href,
}: {
  icon: LucideIcon;
  title: string;
  copy: string;
  count: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group hover:bg-linen/[.025] flex items-center gap-4 py-5 transition sm:px-3"
    >
      <span className="border-iron bg-raised text-copper flex size-10 shrink-0 items-center justify-center rounded-xl border">
        <Icon className="size-4" strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="group-hover:text-amber block text-sm font-semibold">
          {title}
        </span>
        <span className="text-dust mt-1 block text-xs leading-5">{copy}</span>
      </span>
      <span className="text-dust font-mono text-xs">{count}</span>
      <ArrowRight className="text-dust size-4 shrink-0 transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

function EvidenceRecord({
  item,
  usage,
  onChange,
  onDelete,
}: {
  item: EvidenceItem;
  usage: Map<string, number>;
  onChange: (item: EvidenceItem) => void;
  onDelete: () => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <article className="py-7 sm:px-2">
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h3 className="text-lg font-semibold">{item.title}</h3>
            {item.organization && (
              <span className="text-canvas text-sm">· {item.organization}</span>
            )}
          </div>
          {(item.period || item.location) && (
            <div className="text-dust mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {item.period && (
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-3" /> {item.period}
                </span>
              )}
              {item.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3" /> {item.location}
                </span>
              )}
            </div>
          )}
        </div>

        {confirmingDelete ? (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onDelete}
              className="text-kiln text-[10px] font-semibold"
            >
              Delete entry
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="text-dust text-[10px]"
            >
              Keep
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            aria-label={`Delete ${item.title}`}
            className="text-dust hover:text-canvas shrink-0 p-1"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>

      {item.type === "education" ? (
        <EducationFields item={item} />
      ) : (
        item.summary && (
          <p className="text-canvas mt-4 max-w-3xl text-sm leading-6">
            {item.summary}
          </p>
        )
      )}

      {item.claims.length > 0 && (
        <ul className="border-iron/60 divide-iron/60 mt-5 divide-y border-t">
          {item.claims.map((claim) => (
            <ClaimRow
              key={claim.id}
              claim={claim}
              usedBy={usage.get(claim.id) ?? 0}
              onChange={(next) =>
                onChange({
                  ...item,
                  claims: item.claims.map((entry) =>
                    entry.id === claim.id ? next : entry,
                  ),
                })
              }
              onDelete={() =>
                onChange({
                  ...item,
                  claims: item.claims.filter((entry) => entry.id !== claim.id),
                })
              }
            />
          ))}
        </ul>
      )}
    </article>
  );
}

function legacyEducation(item: EvidenceItem) {
  const text = item.claims.map((claim) => claim.content);
  const gpa = text
    .map(
      (value) =>
        value.match(
          /\bGPA(?:\s+(?:of|is))?\s*[:\-]?\s*([\d.]+(?:\s*\/\s*[\d.]+)?)/i,
        )?.[1],
    )
    .find(Boolean);
  const coursework = text
    .map(
      (value) =>
        value.match(/coursework(?:\s+(?:in|includes?))?\s*[:\-]?\s*(.+)/i)?.[1],
    )
    .find(Boolean)
    ?.split(",")
    .map((course) => course.trim())
    .filter(Boolean);
  const minor = item.title.match(/minor\s+in\s+([^,]+)/i)?.[1]?.trim();
  const fieldOfStudy = item.title
    .match(/(?:Bachelor|Master|Associate|Doctor)[^,]*?\s+in\s+([^,]+)/i)?.[1]
    ?.trim();
  return { gpa, coursework, minor, fieldOfStudy };
}

function EducationFields({ item }: { item: EvidenceItem }) {
  const legacy = legacyEducation(item);
  const details = {
    degree: item.education?.degree ?? item.title,
    fieldOfStudy: item.education?.fieldOfStudy ?? legacy.fieldOfStudy,
    minor: item.education?.minor ?? legacy.minor,
    gpa: item.education?.gpa ?? legacy.gpa,
    coursework: item.education?.coursework.length
      ? item.education.coursework
      : (legacy.coursework ?? []),
    honors: item.education?.honors ?? [],
  };

  return (
    <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
      <EvidenceField label="School" value={item.organization} />
      <EvidenceField label="Degree" value={details.degree} />
      <EvidenceField label="Field of study" value={details.fieldOfStudy} />
      <EvidenceField label="Minor" value={details.minor} />
      <EvidenceField label="GPA" value={details.gpa} />
      <EvidenceField
        label="Coursework"
        value={details.coursework.join(" · ")}
        wide
      />
      <EvidenceField label="Honors" value={details.honors.join(" · ")} wide />
    </dl>
  );
}

function EvidenceField({
  label,
  value,
  wide = false,
}: {
  label: string;
  value?: string;
  wide?: boolean;
}) {
  if (!value) return null;
  return (
    <div className={wide ? "sm:col-span-2 lg:col-span-3" : ""}>
      <dt className="text-dust text-[10px] tracking-[.06em] uppercase">
        {label}
      </dt>
      <dd className="text-canvas mt-1.5 text-sm leading-6">{value}</dd>
    </div>
  );
}

function ClaimRow({
  claim,
  usedBy,
  onChange,
  onDelete,
}: {
  claim: EvidenceItem["claims"][number];
  usedBy: number;
  onChange: (claim: EvidenceItem["claims"][number]) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(claim.content);
  const confirmed = ["confirmed", "corrected"].includes(
    claim.verificationStatus,
  );

  function save() {
    const content = draft.trim();
    if (!content) return;
    onChange({
      ...claim,
      content,
      verificationStatus:
        content === claim.content ? claim.verificationStatus : "corrected",
    });
    setEditing(false);
  }

  return (
    <li className="py-4">
      <div className="flex items-start gap-3">
        <span className="bg-copper mt-2 size-1.5 shrink-0 rounded-full" />
        {editing ? (
          <div className="min-w-0 flex-1">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={3}
              aria-label="Edit résumé bullet"
              className="border-iron bg-night/40 text-canvas w-full rounded-lg border p-3 text-sm leading-6 outline-none"
            />
            <div className="mt-2 flex gap-3">
              <button
                type="button"
                onClick={save}
                className="text-copper text-xs font-semibold"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(claim.content);
                  setEditing(false);
                }}
                className="text-dust text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="text-canvas text-sm leading-6">{claim.content}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span
                className={cn(
                  "flex items-center gap-1 text-[10px]",
                  confirmed ? "text-sage" : "text-dust",
                )}
              >
                {confirmed && <Check className="size-3" />}
                {STATUS_LABELS[claim.verificationStatus] ??
                  claim.verificationStatus}
              </span>
              {usedBy > 0 && (
                <span className="text-copper text-[10px]">
                  Supports {usedBy} requirement{usedBy === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </div>
        )}

        {!editing && (
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Edit bullet"
              className="text-dust hover:text-canvas p-2"
            >
              <Pencil className="size-3" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              aria-label="Delete bullet"
              className="text-dust hover:text-canvas p-2"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

function SkillsView({
  groups,
}: {
  groups: WorkspaceSnapshot["candidateSkills"];
}) {
  if (!groups.length) return <SectionEmpty view="skills" query="" />;

  return (
    <dl className="border-iron/75 divide-iron/75 divide-y border-y">
      {groups.map((group, index) => (
        <div
          key={`${group.category}-${index}`}
          className="grid gap-3 py-5 sm:grid-cols-[11rem_1fr] sm:gap-8"
        >
          <dt className="text-sm font-semibold">
            {group.category || "Skills"}
          </dt>
          <dd className="text-canvas flex flex-wrap gap-x-3 gap-y-2 text-sm leading-6">
            {group.skills.map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function SectionEmpty({
  view,
  query,
}: {
  view: Exclude<EvidenceLibraryView, "overview">;
  query: string;
}) {
  return (
    <div className="border-iron/75 rounded-[22px] border py-16 text-center">
      <p className="text-sm font-semibold">
        {query
          ? `Nothing matches “${query}”.`
          : `No ${sectionMeta[view].eyebrow.toLowerCase()} found.`}
      </p>
      <p className="text-dust mx-auto mt-2 max-w-md text-xs leading-5">
        {query
          ? "Try a different search or clear the status filter."
          : "Import or re-import your résumé and review what the parser found."}
      </p>
    </div>
  );
}
