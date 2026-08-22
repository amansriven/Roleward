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
