"use client";

import { ErrorState } from "@/components/errors/error-state";

export default function DashboardError({
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
      title="This view failed to load"
      description="Your workspace data is safe. Retrying reloads just this section."
    />
  );
}
