import { LockKeyhole } from "lucide-react";
import Link from "next/link";
import {
  appleAuthEnabled,
  authConfigured,
  cognitoAuthEnabled,
  githubAuthEnabled,
} from "@/auth";
import { beginManagedLogin } from "@/components/auth/auth-actions";
import { EmailAuthForm } from "@/components/auth/email-auth-form";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const signup = mode === "signup";
  if (!authConfigured)
    return (
      <div className="border-amber/30 bg-amber/[.06] mt-7 rounded-xl border p-4">
        <p className="text-amber text-sm font-semibold">
          Authentication configuration required
        </p>
        <p className="text-canvas mt-2 text-xs leading-5">
          Add an Auth.js secret and configure Cognito or GitHub, then redeploy.
        </p>
      </div>
    );
  return (
    <div className="mt-8">
      {cognitoAuthEnabled && <EmailAuthForm mode={mode} />}
      {cognitoAuthEnabled && (
        <div className="my-5 flex items-center gap-3" role="separator">
          <span className="bg-iron/70 h-px flex-1" />
          <span className="text-dust text-[11px]">or continue with</span>
          <span className="bg-iron/70 h-px flex-1" />
        </div>
      )}
      <form action={beginManagedLogin}>
        <input
          type="hidden"
          name="next"
          value={signup ? "/onboarding" : "/dashboard"}
        />
        <input type="hidden" name="mode" value={mode} />
        <div className="grid gap-3 sm:grid-cols-2">
          {cognitoAuthEnabled && (
            <button
              className="border-iron bg-night/30 text-linen hover:border-canvas/60 flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors"
              name="provider"
              value="google"
              type="submit"
            >
              <GoogleMark /> Google
            </button>
          )}
          {cognitoAuthEnabled && appleAuthEnabled && (
            <button
              className="border-iron bg-night/30 text-linen hover:border-canvas/60 flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors"
              name="provider"
              value="apple"
              type="submit"
            >
              <AppleMark /> Apple
            </button>
          )}
          {githubAuthEnabled && (
            <button
              className="border-iron bg-night/30 text-linen hover:border-canvas/60 flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors"
              name="provider"
              value="github"
              type="submit"
            >
              <GitHubMark /> GitHub
            </button>
          )}
        </div>
      </form>
      <div className="mt-5 flex items-start gap-3">
        <LockKeyhole className="text-sage mt-0.5 size-4 shrink-0" />
        <p className="text-dust text-xs leading-5">
          Your identity provider securely validates your credentials. Roleward
          never stores your password.
        </p>
      </div>
      <p className="text-canvas mt-6 text-center text-sm">
        {signup ? "Already have an account? " : "New to Roleward? "}
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

function GitHubMark() {
  return (
    <svg
      aria-hidden="true"
      className="size-[18px] fill-current"
      viewBox="0 0 24 24"
    >
      <path d="M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2.23c-3.23.7-3.91-1.37-3.91-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.04 1.78 2.72 1.27 3.38.97.1-.75.41-1.27.74-1.56-2.58-.29-5.29-1.29-5.29-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.16 1.18a10.95 10.95 0 0 1 5.76 0c2.19-1.49 3.15-1.18 3.15-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.4-2.72 5.38-5.3 5.67.42.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z" />
    </svg>
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

function AppleMark() {
  return (
    <svg
      aria-hidden="true"
      className="h-[18px] w-[15px] fill-current"
      viewBox="0 0 384 512"
    >
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.7-26.7-47-41.4-84.7-44.3-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.5 4 184.8 4 272.8 4 298.8 8.8 325.7 18.4 353c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.7-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.6-88-61.6-90.2Zm-58.2-164.2c27.5-32.6 25-62.3 24.2-73-24.3 1.4-52.4 16.5-68.4 35.1-17.6 19.9-27.9 44.5-25.7 72.4 26.3 2 50.3-11.5 69.9-34.5Z" />
    </svg>
  );
}
