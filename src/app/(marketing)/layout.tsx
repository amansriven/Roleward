import type { ReactNode } from "react";

import { AmbientWorkshopBackground } from "@/components/brand/ambient-background";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="isolate min-h-screen">
      <AmbientWorkshopBackground />
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}
