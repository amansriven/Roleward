import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "border-iron bg-night/50 text-linen placeholder:text-dust focus:border-amber focus:bg-raised min-h-12 w-full rounded-lg border px-4 text-sm transition-[border-color,box-shadow,background-color] focus:shadow-[0_0_0_3px_rgba(232,166,75,0.12)] focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}
