/**
 * Donations are optional: without a link the support button never renders, so
 * local development and preview deploys stay clean.
 *
 * This points at a Stripe Payment Link, which means no secret key, no webhook,
 * and no card details ever touching this app — Stripe hosts the entire flow.
 */
export const donateUrl = process.env.NEXT_PUBLIC_STRIPE_DONATE_URL ?? "";

export const donationsEnabled = donateUrl.startsWith("https://");
