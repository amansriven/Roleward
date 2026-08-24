import Link from "next/link";

import { Logo } from "@/components/brand/logo";

const groups = [
  {
    title: "Workspaces",
    links: [
      ["Resume Kitchen", "/resume-kitchen"],
      ["Zed", "/zed"],
      ["Stage Fright", "/stage-fright"],
    ],
  },
  {
    title: "Roleward",
    links: [
      ["How it works", "/how-it-works"],
      ["Tip jar", "/tip-jar"],
      ["Log in", "/login"],
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-iron border-t">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr] lg:px-12">
        <div className="max-w-sm">
          <Logo />
          {/* The name is a direction, not a noun — this is where that lands. */}
          <p className="text-linen mt-4 text-sm font-medium">
            Toward the role you want.
          </p>
          <p className="text-canvas mt-3 text-sm leading-6">
            An AI job search workspace connecting applications, resume
            tailoring, coding interview practice, and behavioral preparation for
            your next internship or job.
          </p>
        </div>
        {groups.map((group) => (
          <div key={group.title}>
            <p className="text-dust font-mono text-xs tracking-[0.08em] uppercase">
              {group.title}
            </p>
            <div className="mt-4 flex flex-col gap-3">
              {group.links.map(([label, href]) => (
                <Link
                  key={href}
                  className="text-canvas hover:text-amber text-sm"
                  href={href}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="border-iron/70 text-dust border-t px-5 py-5 text-center font-mono text-[11px] tracking-[0.06em] uppercase">
        Move forward · Go further · Evidence before generation
      </div>
    </footer>
  );
}
