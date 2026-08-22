"use client";

import { ErrorState } from "@/components/errors/error-state";

export default function AuthError({
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
      title="We could not load this step"
      description="No account changes were made. Retrying is safe."
    />
  );
}
