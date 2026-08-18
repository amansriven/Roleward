import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { workspaceStorageConfigured } from "@/modules/aws/config";
import { getPortfolioByHandle } from "@/modules/aws/portfolio-store";
import type { Portfolio } from "@/modules/portfolio/schema";

export const runtime = "nodejs";
/** Published pages change rarely; a short cache keeps a recruiter's load fast. */
export const revalidate = 300;

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

async function load(handle: string): Promise<Portfolio | null> {
  if (!workspaceStorageConfigured) return null;
  const portfolio = await getPortfolioByHandle(handle).catch(() => null);
  // An unpublished page is a 404 to the world, not a "this is hidden" notice.
  return portfolio?.published ? portfolio : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const portfolio = await load(handle);
  if (!portfolio) return { title: "Not found" };
  return {
    title: portfolio.headline
      ? `${portfolio.name} — ${portfolio.headline}`
      : portfolio.name,
    description: portfolio.items[0]?.summary?.slice(0, 160),
  };
}

export default async function PortfolioPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const portfolio = await load(handle);
  if (!portfolio) notFound();

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
        {/* Not a badge for its own sake: everything above was confirmed by the
            person it describes, and saying so is the point of the page. */}
        Every line on this page was confirmed by {portfolio.name.split(" ")[0]}{" "}
        against their own résumé.
      </footer>
    </main>
  );
}
