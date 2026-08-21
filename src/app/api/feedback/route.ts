import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const requestSchema = z.object({
  message: z.string().trim().min(3).max(4000),
  page: z.string().trim().startsWith("/").max(500).optional(),
});

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character,
  );
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!env.RESEND_API_KEY || !env.FEEDBACK_TO_EMAIL)
    return NextResponse.json(
      { error: "Feedback is not configured yet." },
      { status: 503 },
    );

  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Enter a message between 3 and 4,000 characters." },
      { status: 400 },
    );

  const sender = session.user.email || "Signed-in Roleward user";
  const page = parsed.data.page || "Unknown page";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.FEEDBACK_FROM_EMAIL,
      to: [env.FEEDBACK_TO_EMAIL],
      reply_to: session.user.email || undefined,
      subject: "New Roleward feedback",
      text: [
        `From: ${sender}`,
        `Page: ${page}`,
        "",
        parsed.data.message,
      ].join("\n"),
      html: [
        `<p><strong>From:</strong> ${escapeHtml(sender)}</p>`,
        `<p><strong>Page:</strong> ${escapeHtml(page)}</p>`,
        `<p style="white-space: pre-wrap">${escapeHtml(parsed.data.message)}</p>`,
      ].join(""),
    }),
  });

  if (!response.ok) {
    console.error("feedback email failed", response.status, await response.text());
    return NextResponse.json(
      { error: "Feedback could not be sent right now. Please try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({ sent: true });
}
