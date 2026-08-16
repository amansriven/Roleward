import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Log in" };
export default function LoginPage() {
  return (
    <div className="grid w-full items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(400px,480px)] lg:gap-20">
      <section className="hidden max-w-xl lg:block">
        <p className="section-label">Your work, right where you left it</p>
        <h1 className="mt-5 text-5xl font-semibold tracking-[-0.055em] text-balance">
          Keep building toward the role you want.
        </h1>
        <p className="text-canvas mt-6 max-w-lg text-lg leading-8">
          Return to your résumé evidence, interview practice, and next best
          action—without rebuilding your context.
        </p>
        <div className="border-iron/70 mt-10 border-l pl-5">
          <p className="text-linen text-sm leading-6">
            “Preparation should feel focused, not scattered.”
          </p>
          <p className="text-dust mt-2 font-mono text-[10px] tracking-[0.08em] uppercase">
            The Sweet+ approach
          </p>
        </div>
      </section>
      <section className="surface w-full rounded-3xl p-7 sm:p-10">
        <p className="section-label">Welcome back</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
          Log in to Sweet+
        </h2>
        <p className="text-canvas mt-3 text-sm leading-6">
          Choose the same method you used when creating your account.
        </p>
        <AuthForm mode="login" />
      </section>
    </div>
  );
}
