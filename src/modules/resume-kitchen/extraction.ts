import "server-only";

import { z } from "zod";
import {
  candidateContactSchema,
  contactHasValues,
  type CandidateContact,
  type ResumeLink,
} from "@/modules/candidates/contact";
import { INTERVIEW_MODEL, openai } from "@/modules/interviews/openai";
import {
  extractionLooksComplete,
  groundContact,
  groundItems,
  groundSkills,
  type DraftItem,
  type DraftSkillGroup,
} from "./grounding";

/**
 * Reads a resume and proposes evidence the candidate can confirm.
 *
 * The model is asked for a verbatim quote behind every claim, and the quote is
 * then checked against the document. That is not a formality — it is the only
 * thing standing between a candidate and a confirmed metric they never earned.
 * A claim whose quote does not check out is discarded, not softened.
 */

export class ExtractionError extends Error {}

const draftSchema = z.object({
  fullName: z.string().trim(),
  headline: z.string().trim(),
  contact: z.object({
    email: z.string().trim(),
    phone: z.string().trim(),
    location: z.string().trim(),
    linkedinUrl: z.string().trim(),
    githubUrl: z.string().trim(),
    websiteUrl: z.string().trim(),
  }),
  skills: z.array(
    z.object({
      category: z.string().trim(),
      skills: z.array(z.string().trim()),
    }),
  ),
  items: z.array(
    z.object({
      type: z.enum(["experience", "project", "education", "activity", "other"]),
      title: z.string().trim().min(1),
      organization: z.string().trim().optional(),
      period: z.string().trim().optional(),
      location: z.string().trim().optional(),
      links: z.array(
        z.object({
          label: z.string().trim().min(1),
          url: z.url(),
        }),
      ),
      education: z.object({
        degree: z.string().trim(),
        fieldOfStudy: z.string().trim(),
        minor: z.string().trim(),
        gpa: z.string().trim(),
        coursework: z.array(z.string().trim()),
        honors: z.array(z.string().trim()),
      }),
      summary: z.string().trim(),
      claims: z.array(
        z.object({
          type: z.enum([
            "action",
            "outcome",
            "metric",
            "technology",
            "responsibility",
          ]),
          content: z.string().trim().min(1),
          sourceQuote: z.string().trim().min(1),
        }),
      ),
    }),
  ),
});

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["fullName", "headline", "contact", "skills", "items"],
  properties: {
    fullName: {
      type: "string",
      description:
        "The candidate's name exactly as written at the top of the resume. Empty string if there is none.",
    },
    headline: {
      type: "string",
      description:
        "The title or summary line under their name, copied as written. Empty string if there is none.",
    },
    contact: {
      type: "object",
      additionalProperties: false,
      required: [
        "email",
        "phone",
        "location",
        "linkedinUrl",
        "githubUrl",
        "websiteUrl",
      ],
      description:
        "Contact details from the resume header. Use empty strings when absent.",
      properties: {
        email: { type: "string" },
        phone: { type: "string" },
        location: { type: "string" },
        linkedinUrl: { type: "string" },
        githubUrl: { type: "string" },
        websiteUrl: { type: "string" },
      },
    },
    skills: {
      type: "array",
      description:
        "The skills section, grouped as the resume groups them. Empty array if there is no skills section.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category", "skills"],
        properties: {
          category: {
            type: "string",
            description: "The heading used, such as Languages or Tools.",
          },
          skills: { type: "array", items: { type: "string" } },
        },
      },
    },
    items: {
      type: "array",
      description: "One entry per role, project, or activity on the resume.",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "type",
          "title",
          "organization",
          "period",
          "location",
          "links",
          "education",
          "summary",
          "claims",
        ],
        properties: {
          type: {
            type: "string",
            enum: ["experience", "project", "education", "activity", "other"],
          },
          title: {
            type: "string",
            description:
              "Role title for experience/activities, project name for projects, or degree name for education. Copy it as written.",
          },
          organization: {
            type: "string",
            description:
              "Employer, school, or club/organization. Empty string if none is given.",
          },
          period: {
            type: "string",
            description:
              "The dates as written, such as 'June 2025 - August 2025'. Empty string if absent.",
          },
          location: {
            type: "string",
            description: "As written. Empty string if absent.",
          },
          links: {
            type: "array",
            description:
              "HTTP(S) links attached to this project, such as its GitHub repository or live demo. Empty for other entries or when absent.",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["label", "url"],
              properties: {
                label: { type: "string" },
                url: { type: "string" },
              },
            },
          },
          education: {
            type: "object",
            additionalProperties: false,
            required: [
              "degree",
              "fieldOfStudy",
              "minor",
              "gpa",
              "coursework",
              "honors",
            ],
            description:
              "Structured education fields. Use empty strings and arrays for non-education entries or when absent.",
            properties: {
              degree: { type: "string" },
              fieldOfStudy: { type: "string" },
              minor: { type: "string" },
              gpa: { type: "string" },
              coursework: { type: "array", items: { type: "string" } },
              honors: { type: "array", items: { type: "string" } },
            },
          },
          summary: {
            type: "string",
            description:
              "Copy an unbulleted description from the resume if one exists. Otherwise return an empty string. Do not write a new summary.",
          },
          claims: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["type", "content", "sourceQuote"],
              properties: {
                type: {
                  type: "string",
                  enum: [
                    "action",
                    "outcome",
                    "metric",
                    "technology",
                    "responsibility",
                  ],
                },
                content: {
                  type: "string",
                  description:
                    "The complete original bullet with only its bullet glyph removed. Do not split or rewrite it.",
                },
                sourceQuote: {
                  type: "string",
                  description:
                    "The entire original bullet from the resume, copied character for character. Never cite only one clause of a longer bullet.",
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

const INSTRUCTIONS = [
  "You extract structured evidence from a candidate's resume so they can confirm or correct it.",
  "",
  "This is not a writing task. You are reading, not improving.",
  "",
  "Rules, in order of importance:",
  "- Every claim must come from text that is actually on the resume. Never add an accomplishment, a technology, or a responsibility that is not written there.",
  "- sourceQuote must be copied from the resume character for character. Do not paraphrase it, tidy it, or join two separate lines into one quote.",
  "- NEVER introduce a number that is not in the source quote. Do not estimate, round, scale, or convert. If the resume says 'several users', the claim says 'several users'.",
  "- content must not be stronger than its source. 'Helped build' does not become 'Built'. 'Contributed to' does not become 'Led'.",
  "- If a line is vague, extract it vaguely. The candidate will sharpen it themselves; that is what the confirmation step is for.",
  "- Preserve bullet boundaries exactly: ONE source bullet becomes ONE claim. Never split a bullet into separate action, technology, outcome, or metric records, even when it contains several clauses.",
  "- content is the complete source bullet with only the leading bullet glyph removed. Do not paraphrase or shorten it.",
  "- Extract EVERY entry and keep its resume section: experience, projects, education, and activities (leadership, clubs, volunteering, and extracurriculars). Do not summarise or select the best ones.",
  "- For experience and activities, title is the role and organization is the employer, club, or institution. For projects, title is the project name. For education, organization is the school and title is the degree as written.",
  "- Education is structured separately: identify degree, field of study, minor, GPA, coursework, honors, dates, school, and location. Do not turn GPA or coursework into generic claims. Education can have an empty claims array.",
  "- Copy dates and locations as written. Leave them empty rather than guessing.",
  "- Extract contact details into contact: email, phone, header location, LinkedIn, GitHub, and personal website. Copy exactly; leave absent fields empty.",
  "- Embedded hyperlinks are listed after the resume text. Assign a hyperlink to a project only when its label, URL path, or nearby resume text clearly identifies that project. Do not attach the candidate's general LinkedIn, GitHub profile, or personal website as a project link.",
  "- For a project link, use a concise factual label such as GitHub, Live demo, or Project site and copy the full HTTP(S) URL exactly.",
  "- List the skills section as it is grouped. Do not add a skill the resume does not name.",
  "- Skip lists of interests.",
  "- fullName and headline are copied from the top of the resume as written. Do not invent a title the candidate did not give themselves.",
  "",
  "A claim whose quote is not found in the document verbatim is discarded before the candidate ever sees it, so an invented one is wasted output, not a clever addition.",
].join("\n");

export interface ExtractionResult {
  /** As written on the resume, and only if it is actually written there. */
  fullName: string;
  headline: string;
  contact: CandidateContact | null;
  skills: DraftSkillGroup[];
  items: DraftItem[];
  /** Claims the document did not support, kept for logging rather than display. */
  dropped: { content: string; sourceQuote: string; reason: string }[];
}

/** Long resumes are truncated: the model only needs what it can quote. */
const MAX_DOCUMENT_CHARACTERS = 24_000;

/**
 * Reads the resume, and reads it again if the first pass plainly missed most of
 * it. One wasted call is cheaper than a candidate being shown their GPA and
 * nothing else.
 */
export async function extractEvidence(
  documentText: string,
  hyperlinks: ResumeLink[] = [],
): Promise<ExtractionResult> {
  const first = await attemptExtraction(documentText, hyperlinks);
  const claimCount = first.items.reduce(
    (count, item) => count + item.claims.length,
    0,
  );
  if (extractionLooksComplete(claimCount, documentText)) return first;

  console.warn("resume extraction: first pass looked incomplete, retrying", {
    claimCount,
  });
  const second = await attemptExtraction(documentText, hyperlinks);
  const secondCount = second.items.reduce(
    (count, item) => count + item.claims.length,
    0,
  );
  return secondCount > claimCount ? second : first;
}

async function attemptExtraction(
  documentText: string,
  hyperlinks: ResumeLink[],
): Promise<ExtractionResult> {
  const linkText = hyperlinks.length
    ? `\n\nEmbedded hyperlinks from the resume:\n${hyperlinks
        .map((link) => `${link.label}: ${link.url}`)
        .join("\n")}`
    : "";
  const document = `${documentText.slice(0, MAX_DOCUMENT_CHARACTERS)}${linkText}`;

  const response = await openai().chat.completions.create({
    model: INTERVIEW_MODEL,
    // Low: this is transcription with structure, not invention.
    temperature: 0.1,
    messages: [
      { role: "system", content: INSTRUCTIONS },
      { role: "user", content: `Resume:\n\n${document}` },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "resume_evidence",
        strict: true,
        schema: jsonSchema,
      },
    },
  });

  let parsed;
  try {
    parsed = draftSchema.parse(
      JSON.parse(response.choices[0]?.message?.content ?? ""),
    );
  } catch (error) {
    throw new ExtractionError(
      `The extractor returned something unusable: ${
        error instanceof Error ? error.message.slice(0, 200) : "unparseable"
      }`,
    );
  }

  const items: DraftItem[] = parsed.items.map((item) => ({
    ...item,
    organization: item.organization?.trim() ? item.organization : undefined,
    period: item.period?.trim() ? item.period : undefined,
    location: item.location?.trim() ? item.location : undefined,
    links: item.links,
    education:
      item.type === "education"
        ? {
            degree: item.education.degree || undefined,
            fieldOfStudy: item.education.fieldOfStudy || undefined,
            minor: item.education.minor || undefined,
            gpa: item.education.gpa || undefined,
            coursework: item.education.coursework,
            honors: item.education.honors,
          }
        : undefined,
  }));

  const { kept, dropped } = groundItems(items, document);

  // The name and headline are held to the same rule as everything else: if the
  // document does not contain them, we do not have them.
  const fullName =
    parsed.fullName &&
    document.toLowerCase().includes(parsed.fullName.toLowerCase())
      ? parsed.fullName
      : "";
  const headline =
    parsed.headline &&
    document.toLowerCase().includes(parsed.headline.toLowerCase())
      ? parsed.headline
      : "";
  const obvious = obviousContact(documentText, hyperlinks);
  const proposedContact = validContactFields({
    email: parsed.contact.email || obvious.email,
    phone: parsed.contact.phone || obvious.phone,
    location: parsed.contact.location || obvious.location,
    linkedinUrl: parsed.contact.linkedinUrl || obvious.linkedinUrl,
    githubUrl: parsed.contact.githubUrl || obvious.githubUrl,
    websiteUrl: parsed.contact.websiteUrl || obvious.websiteUrl,
  });
  const groundedContact = groundContact(proposedContact, document);
  if (dropped.length)
    console.warn("resume extraction: ungrounded claims dropped", {
      dropped: dropped.length,
      reasons: dropped.map((item) => item.reason),
    });

  if (!kept.length)
    throw new ExtractionError(
      "Nothing on this resume could be matched back to its text. Rather than show you claims we cannot support, we stopped.",
    );

  return {
    fullName,
    headline,
    contact: contactHasValues(groundedContact) ? groundedContact : null,
    skills: groundSkills(parsed.skills, document),
    items: kept,
    dropped,
  };
}

function validContactFields(contact: Record<string, string | undefined>) {
  let valid: CandidateContact = {};
  for (const [key, value] of Object.entries(contact)) {
    if (!value?.trim()) continue;
    const candidate = candidateContactSchema.safeParse({
      ...valid,
      [key]: value.trim(),
    });
    if (candidate.success) valid = candidate.data;
  }
  return valid;
}

function obviousContact(
  document: string,
  hyperlinks: ResumeLink[],
): CandidateContact {
  const email = document.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const phones = document.match(/(?:\+?\d[\d().\s-]{7,}\d)/g) ?? [];
  const phone = phones.find((value) => {
    const digits = value.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 15;
  });
  const linkedinUrl = hyperlinks.find((link) =>
    new URL(link.url).hostname.toLowerCase().includes("linkedin.com"),
  )?.url;
  const githubUrl = hyperlinks.find((link) =>
    new URL(link.url).hostname.toLowerCase().includes("github.com"),
  )?.url;
  const websiteUrl = hyperlinks.find((link) =>
    /portfolio|website|personal|homepage/i.test(link.label),
  )?.url;
  return { email, phone: phone?.trim(), linkedinUrl, githubUrl, websiteUrl };
}
