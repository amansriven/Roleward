"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import {
  requestPasswordReset,
  resetPassword,
  verifyEmail,
} from "@/components/auth/email-auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RecoveryForm({
  kind,
  email = "",
}: {
  kind: "verify" | "request-reset" | "reset";
  email?: string;
}) {
  const handler =
    kind === "verify"
      ? verifyEmail
      : kind === "reset"
        ? resetPassword
        : requestPasswordReset;
  const [state, action, pending] = useActionState(handler, {});
  return (
    <form action={action} className="mt-7 grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="recovery-email">Email address</Label>
        <Input
          defaultValue={email}
          id="recovery-email"
          name="email"
          readOnly={Boolean(email)}
          required
          type="email"
        />
      </div>
      {kind !== "request-reset" && (
        <div className="grid gap-2">
          <Label htmlFor="recovery-code">Six-digit code</Label>
          <Input
            autoComplete="one-time-code"
            id="recovery-code"
            inputMode="numeric"
            maxLength={6}
            name="code"
            pattern="[0-9]{6}"
            placeholder="000000"
            required
          />
        </div>
      )}
      {kind === "reset" && (
        <div className="grid gap-2">
          <Label htmlFor="new-password">New password</Label>
          <Input
            autoComplete="new-password"
            id="new-password"
            minLength={8}
            name="password"
            required
            type="password"
          />
          <p className="text-dust text-[11px]">
            8+ characters with uppercase, lowercase, and a number.
          </p>
        </div>
      )}
      {state.error && (
        <p className="text-kiln text-sm" role="alert">
          {state.error}
        </p>
      )}
      <Button className="h-12" disabled={pending} type="submit">
        {pending && <LoaderCircle className="size-4 animate-spin" />}
        {kind === "verify"
          ? "Verify email"
          : kind === "reset"
            ? "Set new password"
            : "Send reset code"}
      </Button>
    </form>
  );
}
