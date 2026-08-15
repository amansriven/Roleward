"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [message, setMessage] = useState("");
  const router = useRouter();
  const signup = mode === "signup";
  return (
    <form
      className="mt-8 space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage("Opening your workspace…");
        router.push("/dashboard");
      }}
    >
      {signup && (
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            required
            placeholder="Aman Singh"
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          {!signup && (
            <button
              className="text-amber text-xs hover:underline"
              type="button"
              onClick={() =>
                setMessage("Password recovery will be connected with Cognito.")
              }
            >
              Forgot password?
            </button>
          )}
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={signup ? "new-password" : "current-password"}
          required
          minLength={8}
          placeholder="At least 8 characters"
        />
      </div>
      <Button className="w-full" type="submit">
        {signup ? "Create workspace" : "Log in"}
      </Button>
      <p
        className="text-canvas min-h-6 text-center text-xs leading-5"
        aria-live="polite"
      >
        {message}
      </p>
      <p className="text-canvas text-center text-sm">
        {signup ? "Already preparing with Sweet+? " : "New to Sweet+? "}
        <Link
          className="text-amber font-semibold hover:underline"
          href={signup ? "/login" : "/signup"}
        >
          {signup ? "Log in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
