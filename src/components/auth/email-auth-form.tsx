"use client";

import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import {
  logInWithPassword,
  registerWithPassword,
} from "@/components/auth/email-auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EmailAuthForm({ mode }: { mode: "login" | "signup" }) {
  const signup = mode === "signup";
  const [showPassword, setShowPassword] = useState(false);
  const [state, action, pending] = useActionState(
    signup ? registerWithPassword : logInWithPassword,
    {},
  );

  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor={`${mode}-email`}>Email address</Label>
        <Input
          autoComplete="email"
          id={`${mode}-email`}
          name="email"
          placeholder="you@example.com"
          required
          type="email"
        />
      </div>
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={`${mode}-password`}>Password</Label>
          {!signup && (
            <Link
              className="text-amber text-xs hover:underline"
              href="/forgot-password"
            >
              Forgot password?
            </Link>
          )}
        </div>
        <div className="relative">
          <Input
            autoComplete={signup ? "new-password" : "current-password"}
            className="pr-11"
            id={`${mode}-password`}
            minLength={8}
            name="password"
            required
            type={showPassword ? "text" : "password"}
          />
          <button
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="text-dust hover:text-linen absolute inset-y-0 right-0 px-3"
            onClick={() => setShowPassword((visible) => !visible)}
            type="button"
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
        {signup && (
          <p className="text-dust text-[11px] leading-4">
            8+ characters with uppercase, lowercase, and a number.
          </p>
        )}
      </div>
      {state.error && (
        <p className="text-kiln text-sm" role="alert">
          {state.error}
        </p>
      )}
      <Button className="mt-1 h-12 w-full" disabled={pending} type="submit">
        {pending && <LoaderCircle className="size-4 animate-spin" />}
        {pending ? "Please wait…" : signup ? "Create account" : "Log in"}
      </Button>
    </form>
  );
}
