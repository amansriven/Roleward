import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition-[transform,background-color,border-color,box-shadow,color] duration-150 disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        primary:
          "border border-amber bg-amber text-night shadow-[0_0_0_rgba(232,166,75,0)] hover:-translate-y-px hover:bg-[#f0b45c] hover:shadow-[0_0_28px_rgba(232,166,75,0.16)]",
        secondary:
          "border border-iron bg-raised text-linen hover:-translate-y-px hover:border-canvas hover:bg-[#332e28]",
        quiet:
          "border border-transparent text-canvas hover:border-iron hover:bg-linen/[0.04] hover:text-linen",
        destructive:
          "border border-kiln bg-kiln text-night hover:-translate-y-px hover:shadow-[0_0_24px_rgba(213,107,92,0.14)]",
      },
      size: {
        default: "min-h-11 px-5",
        sm: "min-h-9 px-4 text-xs",
        icon: "size-11 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({
  asChild = false,
  className,
  variant,
  size,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return (
    <Component
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
