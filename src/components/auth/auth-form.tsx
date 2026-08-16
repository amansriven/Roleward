import { Apple, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { authConfigured } from "@/auth";
import { beginManagedLogin } from "@/components/auth/auth-actions";
import { EmailAuthForm } from "@/components/auth/email-auth-form";

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
      <EmailAuthForm mode={mode} />
      <div className="my-5 flex items-center gap-3" role="separator">
        <span className="bg-iron/70 h-px flex-1" />
        <span className="text-dust text-[11px]">or continue with</span>
        <span className="bg-iron/70 h-px flex-1" />
      </div>
      <form action={beginManagedLogin}>
        <input
          type="hidden"
          name="next"
          value={signup ? "/onboarding" : "/dashboard"}
        />
        <input type="hidden" name="mode" value={mode} />
        <div className="grid grid-cols-2 gap-3">
          <button
            className="border-iron bg-night/30 text-linen hover:border-canvas/60 flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors"
            name="provider"
            value="google"
            type="submit"
          >
            <GoogleMark /> Google
          </button>
          <button
            className="border-iron bg-night/30 text-linen hover:border-canvas/60 flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors"
            name="provider"
            value="apple"
            type="submit"
          >
            <Apple className="size-[18px]" /> Apple
          </button>
        </div>
      </form>
      <div className="mt-5 flex items-start gap-3">
        <LockKeyhole className="text-sage mt-0.5 size-4 shrink-0" />
        <p className="text-dust text-xs leading-5">
          Cognito securely validates your credentials. Sweet+ never stores your
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

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="size-[18px]" viewBox="0 0 24 24">
      <path
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.55h3.24c1.9-1.75 2.98-4.33 2.98-7.42Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 4.98-.9 6.63-2.35l-3.24-2.55c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.77-5.61-4.14H3.04v2.63A10 10 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.39 13.92A6.02 6.02 0 0 1 6.07 12c0-.67.12-1.32.32-1.92V7.45H3.04A10 10 0 0 0 2 12c0 1.64.39 3.19 1.04 4.55l3.35-2.63Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.94c1.47 0 2.79.5 3.82 1.49l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.63C7.18 7.71 9.39 5.94 12 5.94Z"
        fill="#EA4335"
      />
    </svg>
  );
}
