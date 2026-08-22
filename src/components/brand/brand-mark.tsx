import Image from "next/image";

import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <Image
      src="/roleward-logo.png"
      alt=""
      width={96}
      height={96}
      className={cn("size-8 shrink-0 object-contain", className)}
      priority
    />
  );
}
