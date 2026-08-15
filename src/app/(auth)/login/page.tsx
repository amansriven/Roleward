import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Log in" };
export default function LoginPage() {
  return (
    <>
      <p className="section-label">Welcome back</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">
        Continue your preparation.
      </h1>
      <p className="text-canvas mt-3 text-sm leading-6">
        Your target jobs, evidence, and practice history are waiting.
      </p>
      <AuthForm mode="login" />
    </>
  );
}
