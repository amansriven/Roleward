import {
  BookOpenCheck,
  Braces,
  BriefcaseBusiness,
  CookingPot,
  House,
  MicVocal,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type FeatureIconName =
  | "home"
  | "applications"
  | "resume-kitchen"
  | "evidence"
  | "zed"
  | "stage-fright"
  | "moxie";

const icons: Record<FeatureIconName, LucideIcon> = {
  home: House,
  applications: BriefcaseBusiness,
  "resume-kitchen": CookingPot,
  evidence: BookOpenCheck,
  zed: Braces,
  "stage-fright": MicVocal,
  moxie: Sparkles,
};

const sizes = {
  sm: { frame: "size-7 rounded-lg", icon: "size-3.5" },
  md: { frame: "size-9 rounded-[10px]", icon: "size-4" },
  lg: { frame: "size-11 rounded-xl", icon: "size-[18px]" },
  xl: { frame: "size-14 rounded-2xl", icon: "size-[22px]" },
} as const;

export function FeatureIcon({
  feature,
  size = "md",
  active = false,
  className,
}: {
  feature: FeatureIconName;
  size?: keyof typeof sizes;
  active?: boolean;
  className?: string;
}) {
  const Icon = icons[feature];
  return (
    <span
      className={cn(
        "border-iron bg-raised text-canvas inline-flex shrink-0 items-center justify-center border",
        sizes[size].frame,
        active && "border-amber/30 bg-amber/10 text-amber",
        className,
      )}
      aria-hidden="true"
    >
      <Icon className={sizes[size].icon} strokeWidth={1.8} />
    </span>
  );
}
