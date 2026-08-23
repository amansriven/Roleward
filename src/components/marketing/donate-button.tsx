"use client";

import { Heart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AnalyticsEvent } from "@/modules/analytics/config";
import { track } from "@/modules/analytics/track";

/**
 * `surface` distinguishes the sidebar link from the support page so the funnel
 * can show which one people actually act on.
 */
export function DonateButton({
  href,
  surface,
  label,
}: {
  href: string;
  surface: string;
  label: string;
}) {
  return (
    <Button asChild>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track(AnalyticsEvent.donateClicked, { surface })}
      >
        <Heart className="size-4" />
        {label}
      </a>
    </Button>
  );
}
