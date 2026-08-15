import { ArrowRight, Check, Clock3, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function PageIntro({
  eyebrow,
  title,
  copy,
  action,
}: {
  eyebrow?: string;
  title: string;
  copy: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        {eyebrow && <p className="section-label">{eyebrow}</p>}
        <h1 className="mt-2 text-3xl font-semibold tracking-[-.04em] sm:text-4xl">
          {title}
        </h1>
        <p className="text-canvas mt-2 max-w-2xl text-sm leading-6">{copy}</p>
      </div>
      {action}
    </div>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "border-iron/80 bg-workshop/75 rounded-2xl border",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function ReadinessCard({
  icon: Icon,
  label,
  level,
  value,
  color,
  href,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  level: string;
  value: number;
  color: string;
  href: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="group border-iron/80 bg-workshop/75 hover:border-canvas/40 rounded-2xl border p-5 transition hover:-translate-y-0.5"
    >
      <div className="flex items-center justify-between">
        <div className="bg-linen/[.05] flex size-9 items-center justify-center rounded-lg">
          <Icon className={cn("size-[18px]", color)} />
        </div>
        <ArrowRight className="text-dust size-4 transition-transform group-hover:translate-x-1" />
      </div>
      <p className="mt-5 text-sm font-medium">{label}</p>
      <div className="mt-2 flex items-end justify-between">
        <p className="text-canvas text-xs">{level}</p>
        <p className="font-mono text-xl">
          {value}
          <span className="text-dust text-xs">%</span>
        </p>
      </div>
      <div className="bg-iron mt-3 h-1.5 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full"
          style={{
            width: `${value}%`,
            background:
              color === "text-copper"
                ? "var(--copper)"
                : color === "text-cobalt"
                  ? "var(--cobalt)"
                  : "var(--plum)",
          }}
        />
      </div>
      <p className="text-dust mt-3 text-[11px] leading-4">{detail}</p>
    </Link>
  );
}

export function TaskRow({
  number,
  title,
  meta,
  time,
  href,
  color = "bg-amber",
}: {
  number: string;
  title: string;
  meta: string;
  time: string;
  href: string;
  color?: string;
}) {
  return (
    <Link
      href={href}
      className="group border-iron/65 hover:bg-linen/[.025] flex items-center gap-4 border-t px-5 py-4 first:border-t-0"
    >
      <span
        className={cn(
          "text-night flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-[10px]",
          color,
        )}
      >
        {number}
      </span>
      <div className="min-w-0 flex-1">
        <p className="group-hover:text-amber truncate text-sm font-medium">
          {title}
        </p>
        <p className="text-dust mt-1 truncate text-xs">{meta}</p>
      </div>
      <span className="text-dust hidden items-center gap-1.5 text-[11px] sm:flex">
        <Clock3 className="size-3" />
        {time}
      </span>
      <ArrowRight className="text-dust size-4" />
    </Link>
  );
}

export function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div>
      <p className="text-dust text-[11px] tracking-[.08em] uppercase">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="text-canvas mt-1 text-xs">{note}</p>
    </div>
  );
}

export function CheckItem({
  children,
  done = false,
}: {
  children: ReactNode;
  done?: boolean;
}) {
  return (
    <li className="flex items-start gap-2.5 text-sm">
      <span
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
          done ? "border-sage bg-sage text-night" : "border-iron",
        )}
      >
        {done && <Check className="size-2.5" />}
      </span>
      <span className={done ? "text-dust line-through" : "text-canvas"}>
        {children}
      </span>
    </li>
  );
}
