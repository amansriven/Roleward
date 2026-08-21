import { ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { PageIntro } from "@/components/workspace/dashboard-ui";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  const name = session?.user?.name || "Your Backstage account";
  const email = session?.user?.email || "No email available";

  return (
    <div className="space-y-10">
      <PageIntro
        eyebrow="Workspace"
        title="Settings"
        copy="Review the account and storage details behind this workspace."
      />

      <div className="max-w-3xl space-y-10">
        <section>
          <p className="section-label">Account</p>
          <dl className="border-iron/80 mt-4 border-y">
            <div className="border-iron/70 grid gap-1 border-b py-4 sm:grid-cols-[10rem_1fr] sm:items-center">
              <dt className="text-dust text-xs">Name</dt>
              <dd className="text-sm font-medium">{name}</dd>
            </div>
            <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:items-center">
              <dt className="text-dust text-xs">Email</dt>
              <dd className="text-sm font-medium">{email}</dd>
            </div>
          </dl>
        </section>

        <section className="border-iron/80 flex items-start gap-4 border-y py-5">
          <span className="border-iron bg-raised text-sage flex size-10 shrink-0 items-center justify-center rounded-xl border">
            <ShieldCheck className="size-4" strokeWidth={1.8} />
          </span>
          <div>
            <h2 className="text-sm font-semibold">
              Authentication and storage
            </h2>
            <p className="text-dust mt-2 text-xs leading-5">
              Cognito manages sign-in security. Workspace changes are synced to
              the configured private AWS storage, while display preferences—such
              as the collapsed sidebar—stay on this device.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
