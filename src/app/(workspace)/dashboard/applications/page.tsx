import { Plus } from "lucide-react";
import Link from "next/link";
import { ApplicationList } from "@/components/applications/application-list";
import { PageIntro } from "@/components/workspace/dashboard-ui";
export default function ApplicationsPage() {
  return (
    <div className="space-y-7">
      <PageIntro
        eyebrow="Applications"
        title="Your target roles"
        copy="Ordered by what needs attention first — an approaching interview, a deadline, or preparation that is still thin. Open one to track its status and see what its requirements are missing."
        action={
          <Link
            href="/dashboard/applications/new"
            className="bg-amber text-night flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold"
          >
            <Plus className="size-4" /> Add application
          </Link>
        }
      />
      <ApplicationList />
    </div>
  );
}
