import type { Portfolio } from "@/modules/portfolio/schema";

const TYPE_LABELS = {
  experience: "Experience",
  project: "Projects",
  education: "Education",
  activity: "Activities",
  leadership: "Leadership",
  other: "Other",
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

  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <header>
        <h1 className="text-4xl font-semibold tracking-[-.04em]">
          {portfolio.name}
        </h1>
        {portfolio.headline && (
          <p className="text-canvas mt-3 text-base leading-7">
            {portfolio.headline}
          </p>
        )}
      </header>

      {portfolio.skills.length > 0 && (
        <section className="mt-14">
          <h2 className="section-label">Skills</h2>
          <dl className="mt-6 space-y-4">
            {portfolio.skills.map((group, index) => (
              <div
                key={`${group.category}-${index}`}
                className="grid gap-1.5 sm:grid-cols-[8rem_1fr] sm:gap-4"
              >
                {group.category && (
                  <dt className="text-dust text-xs font-medium">
                    {group.category}
                  </dt>
                )}
                <dd
                  className={
                    group.category
                      ? "text-canvas text-sm leading-6"
                      : "text-canvas text-sm leading-6 sm:col-span-2"
                  }
                >
                  {group.skills.join(" · ")}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {grouped.map((group) => (
        <section key={group.type} className="mt-14">
          <h2 className="section-label">{TYPE_LABELS[group.type]}</h2>
          <div className="mt-6 space-y-9">
            {group.items.map((item, index) => (
              <article key={`${item.title}-${index}`}>
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <h3 className="text-base font-semibold">{item.title}</h3>
                  {item.organization && (
                    <span className="text-dust text-sm">
                      · {item.organization}
                    </span>
                  )}
                </div>
                {(item.period || item.location) && (
                  <p className="text-dust mt-1 text-xs">
                    {[item.period, item.location].filter(Boolean).join(" · ")}
                  </p>
                )}
                {item.summary && (
                  <p className="text-canvas mt-1.5 text-sm leading-6">
                    {item.summary}
                  </p>
                )}
                {item.education && (
                  <dl className="text-canvas mt-3 grid gap-2 text-xs sm:grid-cols-2">
                    {item.education.gpa && (
                      <div>
                        <dt className="text-dust">GPA</dt>
                        <dd>{item.education.gpa}</dd>
                      </div>
                    )}
                    {item.education.minor && (
                      <div>
                        <dt className="text-dust">Minor</dt>
                        <dd>{item.education.minor}</dd>
                      </div>
                    )}
                    {item.education.coursework.length > 0 && (
                      <div className="sm:col-span-2">
                        <dt className="text-dust">Coursework</dt>
                        <dd>{item.education.coursework.join(" · ")}</dd>
                      </div>
                    )}
                  </dl>
                )}
                {item.claims.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {item.claims.map((claim, claimIndex) => (
                      <li
                        key={claimIndex}
                        className="text-canvas text-sm leading-6"
                      >
                        · {claim.content}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}

      <footer className="border-iron/60 text-dust mt-20 border-t pt-6 text-xs">
        Every line on this page was confirmed by {portfolio.name.split(" ")[0]}{" "}
        against their own résumé.
      </footer>
    </main>
  );
}
