"use server";

import { redirect } from "next/navigation";
import {
  appleAuthEnabled,
  authConfigured,
  githubAuthEnabled,
  signIn,
  signOut,
} from "@/auth";

export async function beginManagedLogin(formData: FormData) {
  if (!authConfigured) redirect("/login?error=configuration");
  const requested = String(formData.get("next") || "/dashboard");
  const redirectTo = requested.startsWith("/") ? requested : "/dashboard";
  const mode = formData.get("mode") === "signup" ? "signup" : "login";
  const provider = String(formData.get("provider") || "email");
  if (provider === "github") {
    if (!githubAuthEnabled) redirect("/login?error=configuration");
    await signIn("github", { redirectTo });
    return;
  }
  if (provider === "apple" && !appleAuthEnabled)
    redirect("/login?error=apple-unavailable");
  const authorizationParams: Record<string, string> = {};

  if (mode === "signup") authorizationParams.screen_hint = "signup";
  if (provider === "google") {
    authorizationParams.identity_provider = "Google";
    authorizationParams.prompt = "select_account";
  }
  if (provider === "apple")
    authorizationParams.identity_provider = "SignInWithApple";

  await signIn("cognito", { redirectTo }, authorizationParams);
}

export async function endSession() {
  await signOut({ redirectTo: "/" });
}
