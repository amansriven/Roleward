import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { workspaceStorageConfigured } from "@/modules/aws/config";
import { getPortfolioByHandle } from "@/modules/aws/portfolio-store";
import { PublicPortfolio } from "@/components/portfolio/public-portfolio";
import type { Portfolio } from "@/modules/portfolio/schema";

export const runtime = "nodejs";
/** Published pages change rarely; a short cache keeps a recruiter's load fast. */
export const revalidate = 300;

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

  return <PublicPortfolio portfolio={portfolio} />;
}
