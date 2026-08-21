import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { workspaceStorageConfigured } from "@/modules/aws/config";
import {
  claimHandle,
  getPortfolioByHandle,
  getPortfolioForUser,
  putPortfolio,
} from "@/modules/aws/portfolio-store";
import {
  claimAvailableHandle,
  resolveHandle,
} from "@/modules/portfolio/handle";
import { portfolioSchema } from "@/modules/portfolio/schema";

export const runtime = "nodejs";

const publishSchema = z.object({
  action: z.literal("publish"),
  name: z.string().trim().min(1).max(120),
  headline: z.string().trim().max(200).default(""),
  skills: z
    .array(
      z.object({
        category: z.string().trim().max(120),
        skills: z.array(z.string().trim().min(1).max(120)).max(60),
      }),
    )
    .max(20)
    .default([]),
  items: z
    .array(
      z.object({
        type: z.enum([
          "experience",
          "project",
          "education",
          "activity",
          "leadership",
          "other",
        ]),
        title: z.string().trim().min(1).max(200),
        organization: z.string().trim().max(200).optional(),
        period: z.string().trim().max(120).optional(),
        location: z.string().trim().max(160).optional(),
        education: z
          .object({
            degree: z.string().trim().optional(),
            fieldOfStudy: z.string().trim().optional(),
            minor: z.string().trim().optional(),
            gpa: z.string().trim().optional(),
            coursework: z.array(z.string().trim().min(1)).default([]),
            honors: z.array(z.string().trim().min(1)).default([]),
          })
          .optional(),
        summary: z.string().trim().max(1000).default(""),
        claims: z.array(
          z.object({ content: z.string().trim().min(1).max(600) }),
        ),
      }),
    )
    .min(1)
    .max(40),
});

const requestSchema = z.discriminatedUnion("action", [
  publishSchema,
  z.object({ action: z.literal("unpublish") }),
]);

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!workspaceStorageConfigured)
    return NextResponse.json({ portfolio: null });
  return NextResponse.json({
    portfolio: await getPortfolioForUser(session.user.id).catch(() => null),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!workspaceStorageConfigured)
    return NextResponse.json(
      { error: "Storage is not configured", code: "unconfigured" },
      { status: 503 },
    );

  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const existing = await getPortfolioForUser(session.user.id);

  // Taking a page down leaves the handle with its owner, so republishing later
  // returns them to the same URL they have already given people.
  if (parsed.data.action === "unpublish") {
    if (!existing) return NextResponse.json({ portfolio: null });
    const updated = portfolioSchema.parse({
      ...existing,
      published: false,
      updatedAt: new Date().toISOString(),
    });
    await putPortfolio(updated);
    return NextResponse.json({ portfolio: updated });
  }

  const handle =
    existing?.handle ?? resolveHandle(parsed.data.name, () => false) ?? null;
  if (!handle)
    return NextResponse.json(
      {
        error: "That name cannot be turned into a web address.",
        code: "unusable_name",
      },
      { status: 400 },
    );

  // Two candidates with the same name resolve to the same slug, so the handle
  // is claimed conditionally and the loser is moved along to the next one.
  let taken: string | null = handle;
  if (!existing) {
    taken = await claimAvailableHandle(parsed.data.name, (candidate) =>
      claimHandle(candidate, session.user.id),
    );
    if (!taken)
      return NextResponse.json(
        { error: "We could not find a free address for that name." },
        { status: 409 },
      );
  }

  const now = new Date().toISOString();
  const portfolio = portfolioSchema.parse({
    handle: taken,
    userId: session.user.id,
    name: parsed.data.name,
    headline: parsed.data.headline,
    skills: parsed.data.skills,
    items: parsed.data.items,
    published: true,
    publishedAt: existing?.publishedAt ?? now,
    updatedAt: now,
  });
  await putPortfolio(portfolio);

  // Read back rather than trusting the write, since the URL is about to be
  // handed to the candidate to give to employers.
  const stored = await getPortfolioByHandle(portfolio.handle);
  return NextResponse.json({ portfolio: stored ?? portfolio });
}
