import type { Portfolio } from "@/modules/portfolio/schema";

const TYPE_LABELS = {
  experience: "Experience",
  project: "Projects",
  education: "Education",
  leadership: "Leadership",
  other: "Other",
} as const;

const ORDER: (keyof typeof TYPE_LABELS)[] = [
  "experience",
  "project",
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
                <p className="text-canvas mt-1.5 text-sm leading-6">
                  {item.summary}
                </p>
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
