import { Plus } from "lucide-react";
import Link from "next/link";
import { ApplicationList } from "@/components/applications/application-list";
import { FeatureIcon } from "@/components/brand/feature-icon";
import { PageIntro } from "@/components/workspace/dashboard-ui";
export default function ApplicationsPage() {
  return (
    <div className="space-y-7">
      <PageIntro
        icon={<FeatureIcon feature="applications" size="lg" active />}
        eyebrow="Your search"
        title="Applications"
        copy="Keep every role, deadline, résumé version, and practice plan together. Backstage surfaces the application that needs attention now without turning your search into a spreadsheet."
        action={
          <Link
            href="/dashboard/applications/new"
            className="bg-amber text-night flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold"
          >
            <Plus className="size-4" /> Add application
          </Link>
        }
      />
      <ApplicationList />
    </div>
  );
}
