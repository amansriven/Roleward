import { ArrowRight, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { authConfigured } from "@/auth";
import { beginManagedLogin } from "@/components/auth/auth-actions";
import { Button } from "@/components/ui/button";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const signup = mode === "signup";
  if (!authConfigured)
    return (
      <div className="border-amber/30 bg-amber/[.06] mt-7 rounded-xl border p-4">
        <p className="text-amber text-sm font-semibold">
          Cognito configuration required
        </p>
        <p className="text-canvas mt-2 text-xs leading-5">
          Add the server-side Cognito client ID, client secret, issuer, and
          Auth.js secret, then redeploy.
        </p>
      </div>
    );
  return (
    <div className="mt-8">
      <form action={beginManagedLogin}>
        <input
          type="hidden"
          name="next"
          value={signup ? "/onboarding" : "/dashboard"}
        />
        <Button className="w-full" type="submit">
          {signup ? "Create my secure workspace" : "Continue to secure login"}
          <ArrowRight className="size-4" />
        </Button>
      </form>
      <div className="border-iron/70 mt-5 flex items-start gap-3 border-t pt-5">
        <LockKeyhole className="text-sage mt-0.5 size-4 shrink-0" />
        <p className="text-dust text-xs leading-5">
          Amazon Cognito handles passwords, email verification, recovery, and
          optional MFA. Sweet+ receives a secure server session—not your
          password.
        </p>
      </div>
      <p className="text-canvas mt-6 text-center text-sm">
        {signup ? "Already have an account? " : "New to Sweet+? "}
        <Link
          className="text-amber font-semibold hover:underline"
          href={signup ? "/login" : "/signup"}
        >
          {signup ? "Log in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
}
