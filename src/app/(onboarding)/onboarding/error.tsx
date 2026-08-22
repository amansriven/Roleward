"use client";

import { ErrorState } from "@/components/errors/error-state";

export default function OnboardingError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <ErrorState
      error={error}
      retry={retry}
      title="Setup hit a snag"
      description="Your answers so far are kept. Retrying picks up where you left off."
    />
  );
}
