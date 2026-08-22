"use client";

import { RotateCw } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { reportException } from "@/modules/analytics/track";

/**
 * Shared body for every error boundary. Reporting lives here so an error that
 * reaches any boundary is recorded once, with the digest that ties a client
 * exception back to its server log line.
 */
export function ErrorState({
  error,
  retry,
  title = "Something went wrong",
  description = "This section failed to load. Retrying re-runs it — your work is saved.",
}: {
  error: Error & { digest?: string };
  retry: () => void;
  title?: string;
  description?: string;
}) {
  useEffect(() => {
    reportException(error, { digest: error.digest });
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-5 py-16">
      <div className="surface w-full max-w-md rounded-2xl p-8 text-center">
        <div className="border-iron bg-raised mx-auto flex size-11 items-center justify-center rounded-full border">
          <RotateCw className="text-amber size-5" />
        </div>
        <h2 className="text-linen mt-5 text-xl font-semibold tracking-[-0.03em]">
          {title}
        </h2>
        <p className="text-canvas mt-2 text-sm leading-6">{description}</p>
        <Button className="mt-6 w-full" onClick={() => retry()}>
          Try again
        </Button>
        {error.digest && (
          <p className="text-dust mt-4 font-mono text-[11px]">
            Reference: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
