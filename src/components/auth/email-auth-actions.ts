"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn } from "@/auth";
import {
  confirmAccount,
  createAccount,
  finishPasswordReset,
  resendConfirmation,
  startPasswordReset,
} from "@/modules/identity/cognito-server";

export type AuthActionState = { error?: string; success?: string };

const emailSchema = z.string().trim().toLowerCase().email();
const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .regex(/[a-z]/, "Add a lowercase letter.")
  .regex(/[A-Z]/, "Add an uppercase letter.")
  .regex(/[0-9]/, "Add a number.");

function message(error: unknown) {
  if (!(error instanceof Error)) return "Something went wrong. Try again.";
  const known: Record<string, string> = {
    UsernameExistsException: "An account with this email already exists.",
    CodeMismatchException: "That verification code is incorrect.",
    ExpiredCodeException: "That code expired. Request a new one.",
    InvalidPasswordException: "That password does not meet the requirements.",
    LimitExceededException: "Too many attempts. Please wait and try again.",
    UserNotFoundException: "We couldn’t find an account with that email.",
  };
  return known[error.name] || "Something went wrong. Try again.";
}

export async function logInWithPassword(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = emailSchema.safeParse(formData.get("email"));
  const password = z.string().min(1).safeParse(formData.get("password"));
  if (!email.success || !password.success)
    return { error: "Enter a valid email and password." };
  try {
    await signIn("credentials", {
      email: email.data,
      password: password.data,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError)
      return { error: "Email or password is incorrect." };
    throw error;
  }
  return {};
}

export async function registerWithPassword(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = emailSchema.safeParse(formData.get("email"));
  const password = passwordSchema.safeParse(formData.get("password"));
  if (!email.success) return { error: "Enter a valid email address." };
  if (!password.success)
    return {
      error: password.error.issues[0]?.message || "Check your password.",
    };
  let confirmed = false;
  try {
    const result = await createAccount(email.data, password.data);
    confirmed = Boolean(result.UserConfirmed);
  } catch (error) {
    return { error: message(error) };
  }
  if (confirmed) redirect("/login?verified=true");
  redirect(`/verify-email?email=${encodeURIComponent(email.data)}`);
}

export async function verifyEmail(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = emailSchema.safeParse(formData.get("email"));
  const code = z
    .string()
    .trim()
    .regex(/^\d{6}$/)
    .safeParse(formData.get("code"));
  if (!email.success || !code.success)
    return { error: "Enter the six-digit code from your email." };
  try {
    await confirmAccount(email.data, code.data);
  } catch (error) {
    return { error: message(error) };
  }
  redirect("/login?verified=true");
}

export async function resendEmailCode(formData: FormData) {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) redirect("/signup");
  try {
    await resendConfirmation(email.data);
  } catch {
    // Keep the response generic to avoid disclosing account state.
  }
  redirect(`/verify-email?email=${encodeURIComponent(email.data)}&resent=true`);
}

export async function requestPasswordReset(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { error: "Enter a valid email address." };
  try {
    await startPasswordReset(email.data);
  } catch {
    // Keep this response generic to prevent account enumeration.
  }
  redirect(`/reset-password?email=${encodeURIComponent(email.data)}`);
}

export async function resetPassword(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = emailSchema.safeParse(formData.get("email"));
  const code = z
    .string()
    .trim()
    .regex(/^\d{6}$/)
    .safeParse(formData.get("code"));
  const password = passwordSchema.safeParse(formData.get("password"));
  if (!email.success || !code.success)
    return { error: "Check your email and six-digit code." };
  if (!password.success)
    return {
      error: password.error.issues[0]?.message || "Check your password.",
    };
  try {
    await finishPasswordReset(email.data, code.data, password.data);
  } catch (error) {
    return { error: message(error) };
  }
  redirect("/login?reset=true");
}
