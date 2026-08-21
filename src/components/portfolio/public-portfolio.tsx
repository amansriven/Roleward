import { ArrowUpRight } from "lucide-react";
import type { Portfolio } from "@/modules/portfolio/schema";

const TYPE_LABELS = {
  experience: "Experience",
  project: "Selected projects",
  education: "Education",
  activity: "Activities",
  leadership: "Leadership",
  other: "Additional work",
} as const;

const ORDER: (keyof typeof TYPE_LABELS)[] = [
  "experience",
  "project",
  "activity",
  "leadership",
  "education",
  "other",
];

export function PublicPortfolio({ portfolio }: { portfolio: Portfolio }) {
  const grouped = ORDER.map((type) => ({
    type,
    items: portfolio.items.filter((item) => item.type === type),
  })).filter((group) => group.items.length > 0);
  const initials = portfolio.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <main className="relative isolate min-h-screen overflow-hidden">
      <div className="bg-amber/[.07] pointer-events-none absolute -top-48 right-[-12rem] -z-10 size-[34rem] rounded-full blur-[120px]" />
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <header className="border-iron/80 flex min-h-[72vh] flex-col justify-between border-x px-5 py-6 sm:px-10 sm:py-9 lg:px-14">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="border-amber/35 bg-amber/[.08] text-amber flex size-9 items-center justify-center rounded-xl border font-mono text-xs font-semibold">
                {initials}
              </span>
              <span className="text-dust font-mono text-[9px] tracking-[.14em] uppercase">
                Portfolio / {new Date(portfolio.updatedAt).getFullYear()}
              </span>
            </div>
            <span className="text-dust hidden font-mono text-[9px] tracking-[.12em] uppercase sm:block">
              Verified experience
            </span>
          </div>

          <div className="py-20 sm:py-28">
            <p className="text-amber font-mono text-[10px] tracking-[.18em] uppercase">
              Selected work & experience
            </p>
            <h1 className="mt-5 max-w-4xl text-[clamp(3.4rem,10vw,7.5rem)] leading-[.86] font-semibold tracking-[-.075em]">
              {portfolio.name}
            </h1>
            {portfolio.headline && (
              <p className="text-canvas mt-8 max-w-2xl text-lg leading-8 sm:text-xl">
                {portfolio.headline}
              </p>
            )}
          </div>

          <div className="border-iron/70 flex items-center justify-between border-t pt-5">
            <p className="text-dust text-xs">Scroll to explore</p>
            <ArrowUpRight className="text-amber size-4" />
          </div>
        </header>

        {portfolio.skills.length > 0 && (
          <section className="border-iron/80 grid border-x border-t lg:grid-cols-[13rem_1fr]">
            <div className="border-iron/80 border-b px-5 py-8 lg:border-r lg:border-b-0 lg:px-8">
              <p className="section-label">Toolkit</p>
              <p className="text-dust mt-3 text-xs leading-5">
                Technologies and methods used across the work below.
              </p>
            </div>
            <dl className="divide-y divide-[var(--iron)] px-5 sm:px-10">
              {portfolio.skills.map((group, index) => (
                <div
                  key={`${group.category}-${index}`}
                  className="grid gap-2 py-6 sm:grid-cols-[9rem_1fr] sm:gap-6"
                >
                  <dt className="text-dust font-mono text-[10px] tracking-[.08em] uppercase">
                    {group.category || `Set ${index + 1}`}
                  </dt>
                  <dd className="text-canvas text-sm leading-6">
                    {group.skills.join(" · ")}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {grouped.map((group, groupIndex) => (
          <section
            key={group.type}
            className="border-iron/80 grid border-x border-t lg:grid-cols-[13rem_1fr]"
          >
            <div className="border-iron/80 border-b px-5 py-8 lg:border-r lg:border-b-0 lg:px-8">
              <p className="text-amber font-mono text-[10px]">
                {String(groupIndex + 1).padStart(2, "0")}
              </p>
              <h2 className="mt-3 text-sm font-semibold">
                {TYPE_LABELS[group.type]}
              </h2>
            </div>
            <div className="divide-y divide-[var(--iron)] px-5 sm:px-10">
              {group.items.map((item, index) => (
                <article
                  key={`${item.title}-${index}`}
                  className="py-9 sm:py-11"
                >
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
                    <div>
                      <h3 className="text-xl font-semibold tracking-[-.025em]">
                        {item.title}
                      </h3>
                      {item.organization && (
                        <p className="text-amber mt-1.5 text-sm">
                          {item.organization}
                        </p>
                      )}
                    </div>
                    {(item.period || item.location) && (
                      <p className="text-dust font-mono text-[10px] leading-5 sm:text-right">
                        {item.period}
                        {item.period && item.location ? <br /> : null}
                        {item.location}
                      </p>
                    )}
                  </div>

                  {item.summary && (
                    <p className="text-canvas mt-5 max-w-2xl text-sm leading-6">
                      {item.summary}
                    </p>
                  )}

                  {item.education && (
                    <dl className="border-iron/70 mt-5 grid gap-x-6 gap-y-4 border-y py-4 text-xs sm:grid-cols-2">
                      {item.education.fieldOfStudy && (
                        <PortfolioFact
                          label="Field"
                          value={item.education.fieldOfStudy}
                        />
                      )}
                      {item.education.minor && (
                        <PortfolioFact
                          label="Minor"
                          value={item.education.minor}
                        />
                      )}
                      {item.education.gpa && (
                        <PortfolioFact label="GPA" value={item.education.gpa} />
                      )}
                      {item.education.coursework.length > 0 && (
                        <PortfolioFact
                          label="Coursework"
                          value={item.education.coursework.join(" · ")}
                          wide
                        />
                      )}
                      {item.education.honors.length > 0 && (
                        <PortfolioFact
                          label="Honors"
                          value={item.education.honors.join(" · ")}
                          wide
                        />
                      )}
                    </dl>
                  )}

                  {item.claims.length > 0 && (
                    <ul className="mt-6 space-y-3">
                      {item.claims.map((claim, claimIndex) => (
                        <li
                          key={claimIndex}
                          className="text-canvas grid max-w-3xl grid-cols-[1rem_1fr] gap-3 text-sm leading-6"
                        >
                          <span className="text-amber">—</span>
                          <span>{claim.content}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}

        <footer className="border-iron/80 mb-10 flex flex-col gap-4 border-x border-y px-5 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <p className="max-w-xl text-xs leading-5">
            Every statement was reviewed by {portfolio.name.split(" ")[0]} and
            published from their confirmed résumé evidence.
          </p>
          <p className="text-dust shrink-0 font-mono text-[9px] tracking-[.12em] uppercase">
            Built with Backstage
          </p>
        </footer>
      </div>
    </main>
  );
}

function PortfolioFact({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-dust font-mono text-[9px] tracking-[.08em] uppercase">
        {label}
      </dt>
      <dd className="text-canvas mt-1 leading-5">{value}</dd>
    </div>
  );
}
