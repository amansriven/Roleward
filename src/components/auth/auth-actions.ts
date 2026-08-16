"use server";

import { redirect } from "next/navigation";
import { authConfigured, signIn, signOut } from "@/auth";

export async function beginManagedLogin(formData: FormData) {
  if (!authConfigured) redirect("/login?error=configuration");
  const requested = String(formData.get("next") || "/dashboard");
  const redirectTo = requested.startsWith("/") ? requested : "/dashboard";
  const mode = formData.get("mode") === "signup" ? "signup" : "login";
  const provider = String(formData.get("provider") || "email");
  const authorizationParams: Record<string, string> = {};

  if (mode === "signup") authorizationParams.screen_hint = "signup";
  if (provider === "google") authorizationParams.identity_provider = "Google";
  if (provider === "apple")
    authorizationParams.identity_provider = "SignInWithApple";

  await signIn("cognito", { redirectTo }, authorizationParams);
}

export async function endSession() {
  await signOut({ redirectTo: "/" });
}
