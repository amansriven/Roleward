import { Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ApplicationsNav } from "@/components/applications/applications-nav";
import { PageIntro } from "@/components/workspace/dashboard-ui";

export default function ApplicationsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="space-y-8">
      <PageIntro
        icon={
          <span className="border-amber/25 bg-amber/[.05] flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border">
            <Image
              src="/brand/applications-avatar.png"
              alt="The Applications fox scout"
              width={64}
              height={64}
              className="shrink-0 object-cover object-top"
              priority
            />
          </span>
        }
        eyebrow="Job search"
        title="Applications"
        copy="Track the role, understand the company, and prepare for what happens next."
        action={
          <Link
            href="/dashboard/applications/new"
            className="bg-amber text-night flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold"
          >
            <Plus className="size-4" /> Add application
          </Link>
        }
      />
      <ApplicationsNav />
      {children}
    </div>
  );
}
