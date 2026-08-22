"use client";

import { ErrorState } from "@/components/errors/error-state";

export default function AppError({
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
      title="Something went wrong"
      description="This page failed to load. Retrying re-runs it — nothing was lost."
    />
  );
}
