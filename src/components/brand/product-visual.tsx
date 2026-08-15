import Image from "next/image";

import { cn } from "@/lib/utils";

const assets = {
  resume: {
    src: "/brand/resume-kitchen-hero.png",
    alt: "An evidence-backed résumé held in a precision copper document frame",
  },
  guru: {
    src: "/brand/guru-hero.png",
    alt: "A translucent cobalt logic cube showing a guided solution path",
  },
  stage: {
    src: "/brand/stage-fright-hero.png",
    alt: "A studio microphone surrounded by five rehearsal progression rings",
  },
} as const;

export function ProductVisual({
  product,
  className,
  priority = false,
}: {
  product: keyof typeof assets;
  className?: string;
  priority?: boolean;
}) {
  const asset = assets[product];
  return (
    <figure
      className={cn(
        "tool-border tool-glow bg-workshop relative overflow-hidden rounded-2xl border",
        className,
      )}
    >
      <Image
        className="aspect-[4/3] h-full w-full object-cover transition-transform duration-500 hover:scale-[1.015]"
        src={asset.src}
        alt={asset.alt}
        width={1456}
        height={1092}
        priority={priority}
        sizes="(max-width: 768px) 100vw, 50vw"
      />
      <div className="ring-linen/10 pointer-events-none absolute inset-0 ring-1 ring-inset" />
    </figure>
  );
}
