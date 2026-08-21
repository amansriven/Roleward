import { cn } from "@/lib/utils";
import { useId } from "react";

export function BrandMark({ className }: { className?: string }) {
  const gradientId = useId();
  const edgeGradientId = useId();

  return (
    <svg
      className={cn("size-8 shrink-0", className)}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="1"
        y="1"
        width="46"
        height="46"
        rx="15"
        fill="#101218"
        stroke={`url(#${edgeGradientId})`}
        strokeWidth="2"
      />
      <defs>
        <linearGradient
          id={edgeGradientId}
          x1="7"
          y1="4"
          x2="43"
          y2="46"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FF9A3D" stopOpacity=".8" />
          <stop offset=".38" stopColor="#444955" stopOpacity=".55" />
          <stop offset="1" stopColor="#FF7A59" stopOpacity=".75" />
        </linearGradient>
        <linearGradient
          id={gradientId}
          x1="19"
          y1="29"
          x2="40"
          y2="8"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FF7A59" />
          <stop offset="1" stopColor="#FF9A3D" />
        </linearGradient>
      </defs>
      <path
        d="M10.5 9.5h15.2l6.8 6.8-6.3 6.3h-7.5v15.9h-8.2v-29Z"
        fill="#F5F2ED"
      />
      <path d="m26.2 22.6 13.3 15.9H29.1L18.7 28.1l7.5-5.5Z" fill="#F5F2ED" />
      <path
        d="M25.3 9.5h14.2v14.2l-4.4-4.4-9.8 9.8-5.8-5.8 9.8-9.8-4-4Z"
        fill={`url(#${gradientId})`}
      />
    </svg>
  );
}
