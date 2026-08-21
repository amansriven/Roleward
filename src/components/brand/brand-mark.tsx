import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
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
        rx="14"
        fill="#17191E"
        stroke="#343740"
        strokeWidth="2"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 8.5h12.4c7.2 0 11.6 3.65 11.6 9.15 0 3.35-1.72 5.86-5.05 7.36C34.88 26.3 37 29.08 37 32.82c0 6.07-4.7 9.68-12.86 9.68H12v-34Zm8 7.18v6.42h4.02c2.74 0 4.28-1.12 4.28-3.24 0-2.08-1.54-3.18-4.28-3.18H20Zm0 13v6.64h4.72c2.93 0 4.58-1.17 4.58-3.36 0-2.13-1.65-3.28-4.58-3.28H20Z"
        fill="#DF7C68"
      />
      <path
        d="M15.9 11.6v27.2"
        stroke="#F5F2ED"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
      <path
        d="m30.8 12.2-4.15 12.65 4.78 13.02"
        stroke="#F5F2ED"
        strokeOpacity=".34"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
