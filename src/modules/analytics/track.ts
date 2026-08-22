"use client";

import posthog from "posthog-js";

import { analyticsEnabled, type AnalyticsEventName } from "./config";

export function track(
  event: AnalyticsEventName,
  properties?: Record<string, unknown>,
) {
  if (!analyticsEnabled) return;
  posthog.capture(event, properties);
}

/**
 * Errors are worth recording even when analytics is disabled, so the console
 * path always runs — otherwise a local crash would leave no trace at all.
 */
export function reportException(
  error: unknown,
  properties?: Record<string, unknown>,
) {
  console.error(error);
  if (!analyticsEnabled) return;
  posthog.captureException(error, properties);
}
