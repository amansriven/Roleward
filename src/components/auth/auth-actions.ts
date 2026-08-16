"use server";

import { redirect } from "next/navigation";
import { authConfigured, signIn, signOut } from "@/auth";

export async function beginManagedLogin(formData: FormData) {
  if (!authConfigured) redirect("/login?error=configuration");
  const requested = String(formData.get("next") || "/dashboard");
  const redirectTo = requested.startsWith("/") ? requested : "/dashboard";
  await signIn("cognito", { redirectTo });
}

export async function endSession() {
  await signOut({ redirectTo: "/" });
}
