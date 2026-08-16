import { RecoveryForm } from "@/components/auth/recovery-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email = "" } = await searchParams;
  return (
    <section className="surface mx-auto w-full max-w-md rounded-3xl p-7 sm:p-10">
      <p className="section-label">Almost there</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
        Choose a new password
      </h1>
      <p className="text-canvas mt-3 text-sm leading-6">
        Enter the code from your email and a new password.
      </p>
      <RecoveryForm email={email} kind="reset" />
    </section>
  );
}
