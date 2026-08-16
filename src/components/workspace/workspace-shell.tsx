"use client";

import {
  BriefcaseBusiness,
  ChefHat,
  Code2,
  Home,
  Menu,
  LogOut,
  MessageSquareText,
  Plus,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { endSession } from "@/components/auth/auth-actions";
import { cn } from "@/lib/utils";
import {
  getActiveApplication,
  loadWorkspace,
} from "@/modules/workspace/repository";

const navigation = [
  { label: "Home", note: "Your next step", href: "/dashboard", icon: Home },
  {
    label: "Applications",
    note: "Jobs you’re preparing for",
    href: "/dashboard/applications",
    icon: BriefcaseBusiness,
  },
  {
    label: "Resume",
    note: "Resume Kitchen",
    href: "/dashboard/resume-kitchen",
    icon: ChefHat,
    color: "text-copper",
  },
  {
    label: "Coding",
    note: "Guru practice",
    href: "/dashboard/guru",
    icon: Code2,
    color: "text-cobalt",
  },
  {
    label: "Stories",
    note: "Stage Fright practice",
    href: "/dashboard/stage-fright",
    icon: MessageSquareText,
    color: "text-plum",
  },
] as const;

function ActiveTarget({ card = false }: { card?: boolean }) {
  const [label, setLabel] = useState("No active application");
  const [deadline, setDeadline] = useState(
    "Add a role to personalize your plan",
  );
  useEffect(() => {
    queueMicrotask(() => {
      const app = getActiveApplication(loadWorkspace(localStorage));
      if (app) {
        setLabel(app.companyName + " · " + app.roleTitle);
        setDeadline(
          app.deadline
            ? "Deadline " + app.deadline
            : app.requirements.length + " requirements confirmed",
        );
      }
    });
  }, []);
  if (!card)
    return (
      <span className="text-dust hidden max-w-64 truncate text-xs sm:block">
        {label}
      </span>
    );
  return (
    <div className="border-iron/60 bg-night/35 mb-3 rounded-xl border p-3">
      <p className="text-dust text-[10px]">Preparing for</p>
      <Link
        href="/dashboard/applications"
        className="hover:text-amber mt-1 block truncate text-sm font-medium"
      >
        {label}
      </Link>
      <p className="text-sage mt-2 text-[10px]">{deadline}</p>
    </div>
  );
}

function Sidebar({ close }: { close?: () => void }) {
  const pathname = usePathname();
  return (
    <aside className="bg-workshop/95 border-iron/60 flex h-full w-[252px] shrink-0 flex-col border-r px-4 py-5">
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
      <nav className="mt-9 space-y-1.5" aria-label="Workspace navigation">
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
                "group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors",
                active
                  ? "bg-linen/[.075] text-linen"
                  : "text-canvas hover:bg-linen/[.035] hover:text-linen",
              )}
            >
              <span
                className={cn(
                  "bg-linen/[.035] flex size-8 shrink-0 items-center justify-center rounded-lg",
                  active && "bg-linen/[.07]",
                )}
              >
                <item.icon
                  className={cn(
                    "size-4",
                    "color" in item
                      ? item.color
                      : active
                        ? "text-amber"
                        : "text-canvas",
                  )}
                />
              </span>
              <span>
                <span className="block text-sm font-medium">{item.label}</span>
                <span className="text-dust mt-0.5 block text-[10px]">
                  {item.note}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto">
        <ActiveTarget card />
        <Link
          href="/dashboard/settings"
          className="text-canvas hover:bg-linen/[.035] flex items-center gap-3 rounded-lg px-3 py-2 text-xs"
        >
          <Settings className="size-4" /> Settings
        </Link>
        <div className="mt-2 flex items-center gap-3 px-3 py-2">
          <div className="bg-amber/12 text-amber flex size-8 items-center justify-center rounded-full">
            <UserRound className="size-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium">Your workspace</p>
            <p className="text-dust text-[10px]">Cognito protected</p>
          </div>
          <form action={endSession}>
            <button
              aria-label="Log out"
              className="text-dust hover:text-linen"
              type="submit"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-night flex min-h-screen [background-image:radial-gradient(circle_at_72%_0%,rgba(232,166,75,.045),transparent_32%)]">
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
      <div className="min-w-0 flex-1 lg:pl-[252px]">
        <header className="bg-night/82 border-iron/50 sticky top-0 z-30 flex h-16 items-center border-b px-4 backdrop-blur-xl sm:px-7">
          <button
            className="text-canvas lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <ActiveTarget />
            <Link
              href="/dashboard/applications/new"
              className="border-iron bg-workshop hover:border-canvas/50 text-canvas flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs"
            >
              <Plus className="size-3.5" /> New application
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1180px] px-4 py-7 sm:px-7 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
