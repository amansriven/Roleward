"use client";

import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import { ErrorState } from "@/components/errors/error-state";

import "./globals.css";

/**
 * Replaces the root layout when the layout itself fails, so it has to bring its
 * own document shell, fonts, and styles.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      lang="en"
      data-scroll-behavior="smooth"
    >
      <body className="bg-night antialiased">
        <ErrorState
          error={error}
          retry={retry}
          title="Roleward failed to load"
          description="Something broke before the page could render. Retrying reloads the app."
        />
      </body>
    </html>
  );
}
