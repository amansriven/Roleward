import Link from "next/link";
import { RecoveryForm } from "@/components/auth/recovery-form";

export default function ForgotPasswordPage() {
  return (
    <section className="surface mx-auto w-full max-w-md rounded-3xl p-7 sm:p-10">
      <p className="section-label">Account recovery</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
        Reset your password
      </h1>
      <p className="text-canvas mt-3 text-sm leading-6">
        We’ll send a six-digit recovery code to your verified email.
      </p>
      <RecoveryForm kind="request-reset" />
      <Link
        className="text-dust hover:text-linen mt-5 block text-center text-sm"
        href="/login"
      >
        Back to login
      </Link>
    </section>
  );
}
