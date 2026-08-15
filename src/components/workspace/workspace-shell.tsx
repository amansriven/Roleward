"use client";

import {
  Bell,
  BriefcaseBusiness,
  ChefHat,
  Code2,
  Home,
  Menu,
  MessageSquareText,
  Plus,
  Search,
  Settings,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "Today", href: "/dashboard", icon: Home },
  {
    label: "Applications",
    href: "/dashboard/applications",
    icon: BriefcaseBusiness,
  },
  {
    label: "Resume Kitchen",
    href: "/dashboard/resume-kitchen",
    icon: ChefHat,
    color: "text-copper",
  },
  { label: "Guru", href: "/dashboard/guru", icon: Code2, color: "text-cobalt" },
  {
    label: "Stage Fright",
    href: "/dashboard/stage-fright",
    icon: MessageSquareText,
    color: "text-plum",
  },
] as const;

function Sidebar({ close }: { close?: () => void }) {
  const pathname = usePathname();
  return (
    <aside className="bg-workshop border-iron/80 flex h-full w-[268px] shrink-0 flex-col border-r px-4 py-5">
      <div className="flex items-center justify-between px-2">
        <Logo />
        {close && (
          <button
            onClick={close}
            className="text-dust lg:hidden"
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>
        )}
      </div>
      <div className="mt-8 px-2">
        <p className="text-dust font-mono text-[10px] tracking-[.12em] uppercase">
          Active target
        </p>
        <Link
          href="/dashboard/applications"
          className="border-iron bg-night/55 hover:border-canvas/50 mt-2 block rounded-xl border p-3 transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Software Engineer</p>
              <p className="text-canvas mt-1 text-xs">Stripe · New grad</p>
            </div>
            <span className="bg-sage mt-1 size-2 rounded-full shadow-[0_0_12px_rgba(121,168,151,.7)]" />
          </div>
          <div className="bg-iron mt-3 h-1 overflow-hidden rounded-full">
            <div className="bg-amber h-full w-[68%] rounded-full" />
          </div>
          <p className="text-dust mt-2 text-[11px]">68% preparation complete</p>
        </Link>
      </div>
      <nav className="mt-6 space-y-1" aria-label="Workspace navigation">
        {navigation.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === item.href
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={close}
              className={cn(
                "text-canvas hover:bg-linen/[.04] hover:text-linen flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active && "bg-linen/[.07] text-linen",
              )}
            >
              <item.icon
                className={cn(
                  "size-[18px]",
                  "color" in item ? item.color : undefined,
                  active && !("color" in item) && "text-amber",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-iron/70 mt-auto space-y-1 border-t pt-4">
        <Link
          href="/dashboard/settings"
          className="text-canvas hover:bg-linen/[.04] flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm"
        >
          <Settings className="size-[18px]" /> Settings
        </Link>
        <div className="flex items-center gap-3 px-3 pt-3">
          <div className="bg-amber/15 text-amber flex size-9 items-center justify-center rounded-full">
            <UserRound className="size-4" />
          </div>
          <div>
            <p className="text-sm font-medium">Aman</p>
            <p className="text-dust text-[11px]">New-grad track</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-night flex min-h-screen">
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">
        <Sidebar />
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-black/65"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          />
          <div className="relative h-full w-fit">
            <Sidebar close={() => setOpen(false)} />
          </div>
        </div>
      )}
      <div className="min-w-0 flex-1 lg:pl-[268px]">
        <header className="bg-night/85 border-iron/70 sticky top-0 z-30 flex h-16 items-center justify-between border-b px-4 backdrop-blur-xl sm:px-7">
          <button
            className="text-canvas lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>
          <div className="text-dust hidden items-center gap-2 text-sm sm:flex">
            <Search className="size-4" />
            <span>Search your workspace</span>
            <kbd className="border-iron ml-2 rounded border px-1.5 py-0.5 font-mono text-[10px]">
              ⌘ K
            </kbd>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/dashboard/applications"
              className="text-canvas hover:text-linen border-iron hidden items-center gap-2 rounded-lg border px-3 py-2 text-xs sm:flex"
            >
              <Plus className="size-3.5" /> Add application
            </Link>
            <button
              className="text-canvas hover:text-linen relative flex size-9 items-center justify-center"
              aria-label="Notifications"
            >
              <Bell className="size-[18px]" />
              <span className="bg-amber absolute top-1.5 right-1.5 size-1.5 rounded-full" />
            </button>
            <Sparkles className="text-amber size-4" />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] px-4 py-7 sm:px-7 lg:px-9 lg:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}
