import type { Metadata } from "next";
import { Check } from "lucide-react";
import Image from "next/image";

import { DonateButton } from "@/components/marketing/donate-button";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbStructuredData, pageMetadata } from "@/lib/seo";
import { donateUrl, donationsEnabled } from "@/modules/billing/config";

export const metadata: Metadata = pageMetadata({
  title: "Tip Jar",
  description:
    "Roleward is free to use and paid for by one person. If it has moved your job search forward, you can chip in to keep it running.",
  path: "/tip-jar",
});

const costs = [
  "The model calls behind Moxie, resume tailoring, and Zed coaching",
  "Live rehearsal sessions in Stage Fright",
  "Hosting, storage, and the domain everything runs on",
] as const;

export default function SupportPage() {
  return (
    <main>
      <JsonLd data={breadcrumbStructuredData("Tip jar", "/tip-jar")} />

      <section className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-8 lg:py-28">
        <p className="section-label">Tip jar</p>
        <h1 className="mt-5 text-5xl font-semibold tracking-[-0.045em] text-balance sm:text-6xl">
          Roleward stays free.
          <br />
          <span className="text-amber">Something still pays for it.</span>
        </h1>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-20 sm:px-8">
        <article className="surface rounded-2xl p-7 sm:p-9">
          <div className="flex items-center gap-3">
            <span className="relative shrink-0">
              <Image
                src="/assistant/moxie-avatar-v1.png"
                alt="Moxie"
                width={48}
                height={48}
                className="size-11 rounded-2xl object-cover ring-1 ring-white/10"
              />
              <span className="border-workshop bg-sage absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2" />
            </span>
            <div>
              <p className="text-sm font-semibold">Moxie</p>
              <p className="text-dust text-[11px]">Your career copilot</p>
            </div>
          </div>

          <div className="text-canvas mt-6 max-w-[60ch] space-y-3 text-[15px] leading-7">
            <p>Running me costs real money. One person covers it.</p>
            <p className="text-linen">
              If Roleward has moved your search forward, chip in. If it
              hasn&apos;t yet, don&apos;t — I&apos;d rather earn it.
            </p>
          </div>

          {donationsEnabled && (
            <div className="mt-8">
              <DonateButton
                href={donateUrl}
                surface="tip_jar_page"
                label="Chip in"
              />
              <p className="text-dust mt-3 text-xs">
                Secure checkout on Stripe. Any amount, one time, no account
                needed.
              </p>
            </div>
          )}
        </article>
      </section>

      <section className="mx-auto max-w-3xl px-5 pb-24 sm:px-8">
        <p className="text-dust font-mono text-xs tracking-[0.08em] uppercase">
          Where it goes
        </p>
        <ul className="border-iron mt-5 space-y-4 border-t pt-6">
          {costs.map((cost) => (
            <li key={cost} className="text-canvas flex gap-3 text-sm">
              <Check className="text-sage size-4 shrink-0" />
              {cost}
            </li>
          ))}
        </ul>
        <p className="text-dust mt-8 text-xs leading-6">
          Roleward is an independent project, not a registered nonprofit, so
          contributions are support rather than tax-deductible donations. They
          buy no features and unlock nothing — the product is the same either
          way.
        </p>
      </section>
    </main>
  );
}
