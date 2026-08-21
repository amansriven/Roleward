import { describe, expect, it } from "vitest";
import { jobPostingHtmlToText, parseJobPostingDocument } from "./job-posting";

describe("job posting document parsing", () => {
  it("reads structured job metadata and keeps the description readable", () => {
    const html = `
      <html><head><script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "JobPosting",
          "title": "Software Engineer, New Grad",
          "hiringOrganization": { "@type": "Organization", "name": "Acme" },
          "jobLocation": {
            "address": {
              "addressLocality": "Austin",
              "addressRegion": "TX",
              "addressCountry": "US"
            }
          },
          "description": "<p>Build reliable APIs for millions of customers.</p><p>Work with TypeScript, PostgreSQL, and product partners to ship thoughtful software that solves real customer problems.</p>"
        }
      </script></head><body>Fallback page copy</body></html>
    `;

    expect(parseJobPostingDocument(html)).toEqual({
      companyName: "Acme",
      roleTitle: "Software Engineer, New Grad",
      location: "Austin, TX, US",
      description:
        "Build reliable APIs for millions of customers.\nWork with TypeScript, PostgreSQL, and product partners to ship thoughtful software that solves real customer problems.",
    });
  });

  it("finds JobPosting data inside an @graph and recognizes remote work", () => {
    const html = `<script type="application/ld+json">{
      "@graph": [
        {"@type":"Organization","name":"Backstage"},
        {
          "@type":["Thing","JobPosting"],
          "title":"Platform Engineer",
          "hiringOrganization":"Signal Labs",
          "jobLocationType":"TELECOMMUTE",
          "description":"Design dependable platform systems and developer tooling. Collaborate with engineers across the company to improve reliability, deployment safety, and observability."
        }
      ]
    }</script>`;

    const posting = parseJobPostingDocument(html);
    expect(posting.companyName).toBe("Signal Labs");
    expect(posting.roleTitle).toBe("Platform Engineer");
    expect(posting.location).toBe("Remote");
  });

  it("falls back to visible page text when structured data is unavailable", () => {
    const html = `<main><h1>Frontend Engineer</h1><p>Build accessible product interfaces &amp; design systems.</p></main>`;
    expect(jobPostingHtmlToText(html)).toBe(
      "Frontend Engineer\nBuild accessible product interfaces & design systems.",
    );
    expect(parseJobPostingDocument(html).companyName).toBe("");
  });
});
