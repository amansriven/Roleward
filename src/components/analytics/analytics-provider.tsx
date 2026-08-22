"use client";

import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { Suspense, useEffect } from "react";

import {
  analyticsEnabled,
  analyticsHost,
  analyticsKey,
} from "@/modules/analytics/config";

function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!analyticsEnabled) return;
    const query = searchParams.toString();
    posthog.capture("$pageview", {
      $current_url: `${window.location.origin}${pathname}${query ? `?${query}` : ""}`,
    });
  }, [pathname, searchParams]);

  return null;
}

export function AnalyticsProvider() {
  useEffect(() => {
    if (!analyticsEnabled) return;
    posthog.init(analyticsKey, {
      api_host: analyticsHost,
      // The App Router does not emit history events PostHog can hook, so
      // pageviews are captured by PageViewTracker instead.
      capture_pageview: false,
      capture_pageleave: true,
      persistence: "localStorage+cookie",
      // Replay is how dead clicks and abandoned steps get diagnosed. Inputs are
      // masked by default, which matters here: onboarding and the workspace
      // carry resumes, job descriptions, and interview answers.
      disable_session_recording: false,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: "[data-private]",
      },
    });
  }, []);

  if (!analyticsEnabled) return null;

  return (
    <Suspense fallback={null}>
      <PageViewTracker />
    </Suspense>
  );
}
