import Link from "next/link";
import { RecoveryForm } from "@/components/auth/recovery-form";
import { resendEmailCode } from "@/components/auth/email-auth-actions";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; resent?: string }>;
}) {
  const { email = "", resent } = await searchParams;
  return (
    <section className="surface mx-auto w-full max-w-md rounded-3xl p-7 sm:p-10">
      <p className="section-label">Check your inbox</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
        Verify your email
      </h1>
      <p className="text-canvas mt-3 text-sm leading-6">
        Enter the six-digit code Cognito sent to {email || "your email"}.
      </p>
      {resent && <p className="text-sage mt-4 text-sm">A new code was sent.</p>}
      <RecoveryForm email={email} kind="verify" />
      <form action={resendEmailCode} className="mt-5 text-center">
        <input name="email" type="hidden" value={email} />
        <button className="text-amber text-sm hover:underline" type="submit">
          Resend code
        </button>
      </form>
      <Link
        className="text-dust hover:text-linen mt-4 block text-center text-sm"
        href="/login"
      >
        Back to login
      </Link>
    </section>
  );
}
