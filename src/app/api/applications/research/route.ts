import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  companyResearchJsonSchema,
  companyResearchSchema,
} from "@/modules/applications/company-research";
import {
  interviewsConfigured,
  openai,
  RESEARCH_MODEL,
} from "@/modules/interviews/openai";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  companyName: z.string().trim().min(1).max(160),
  roleTitle: z.string().trim().min(1).max(200),
  location: z.string().trim().max(200).optional(),
  sourceUrl: z.union([z.literal(""), z.url()]),
  jobDescription: z.string().trim().min(80).max(20_000),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!interviewsConfigured)
    return NextResponse.json(
      { error: "Company research is not configured." },
      { status: 503 },
    );

  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Choose a saved application with a complete job posting." },
      { status: 400 },
    );

  const role = parsed.data;
  const today = new Date().toISOString().slice(0, 10);
  try {
    const response = await openai().responses.create({
      model: RESEARCH_MODEL,
      store: false,
      tools: [{ type: "web_search", search_context_size: "medium" }],
      include: ["web_search_call.action.sources"],
      instructions: [
        "You are a careful company research analyst helping a job candidate prepare.",
        "Use current web search. Prefer the company site, investor relations, reputable business reporting, and recent official announcements.",
        "Separate facts from interpretation. Never invent an event, date, source, culture claim, or interview process detail.",
        "Recent events should normally be from the last 12 months and directly relevant to the company, its market, products, leadership, finances, or hiring context.",
        "Every recent event must include the direct source URL that supports it.",
        "Make the advice specific to the supplied role. Keep it concise and practical.",
        "If the company is ambiguous, use the job URL, role, location, and posting to identify it. Return fewer events rather than guessing.",
      ].join("\n"),
      input: [
        `Today: ${today}`,
        `Company: ${role.companyName}`,
        `Role: ${role.roleTitle}`,
        `Location: ${role.location || "Not specified"}`,
        `Original posting: ${role.sourceUrl || "Not provided"}`,
        `Job description:\n${role.jobDescription}`,
      ].join("\n\n"),
      text: {
        format: {
          type: "json_schema",
          name: "company_research",
          strict: true,
          schema: companyResearchJsonSchema,
        },
      },
    });

    const research = companyResearchSchema.parse(
      JSON.parse(response.output_text),
    );
    return NextResponse.json({
      research,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("company research failed", error);
    return NextResponse.json(
      { error: "Backstage could not complete that research right now." },
      { status: 502 },
    );
  }
}
