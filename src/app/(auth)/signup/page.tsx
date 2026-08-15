import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Create an account" };
export default function SignupPage() {
  return (
    <>
      <p className="section-label">Start with direction</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">
        Create your Sweet+ workspace.
      </h1>
      <p className="text-canvas mt-3 text-sm leading-6">
        Bring one résumé and one target role. We’ll build the route together.
      </p>
      <AuthForm mode="signup" />
    </>
  );
}
