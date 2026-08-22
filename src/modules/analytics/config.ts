/**
 * Analytics is optional: without a key the provider mounts nothing and every
 * `track` call is a no-op, so local development and preview deploys stay clean.
 */
export const analyticsKey = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "";

export const analyticsHost =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

export const analyticsEnabled = analyticsKey.length > 0;

/** Events worth naming once, so funnels are not built on typo'd strings. */
export const AnalyticsEvent = {
  signupStarted: "signup_started",
  loginStarted: "login_started",
  ctaClicked: "cta_clicked",
} as const;

export type AnalyticsEventName =
  (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];
