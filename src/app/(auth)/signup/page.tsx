import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Create an account" };
export default function SignupPage() {
  return (
    <div className="grid w-full items-center gap-12 lg:grid-cols-[minmax(400px,480px)_minmax(0,1fr)] lg:gap-20">
      <section className="surface w-full rounded-3xl p-7 sm:p-10">
        <p className="section-label">Start with direction</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
          Create your workspace
        </h1>
        <p className="text-canvas mt-3 text-sm leading-6">
          A private place for your resume, target roles, and practice.
        </p>
        <AuthForm mode="signup" />
      </section>
      <section className="hidden max-w-xl lg:block">
        <p className="section-label">One workspace. Three focused tools.</p>
        <h2 className="mt-5 text-5xl font-semibold tracking-[-0.055em] text-balance">
          Turn preparation into a repeatable system.
        </h2>
        <div className="mt-9 grid gap-3">
          {[
            ["01", "Resume Kitchen", "Shape credible, role-specific evidence."],
            ["02", "Zed", "Know what to learn and practice next."],
            [
              "03",
              "Stage Fright",
              "Rehearse until your delivery feels natural.",
            ],
          ].map(([number, title, copy]) => (
            <div
              className="border-iron/70 flex gap-5 border-t py-4"
              key={title}
            >
              <span className="text-amber font-mono text-xs">{number}</span>
              <div>
                <p className="text-linen text-sm font-semibold">{title}</p>
                <p className="text-dust mt-1 text-sm">{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
