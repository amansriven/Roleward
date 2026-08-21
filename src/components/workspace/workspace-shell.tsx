"use client";

import {
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { endSession } from "@/components/auth/auth-actions";
import { Logo } from "@/components/brand/logo";
import {
  FeatureIcon,
  type FeatureIconName,
} from "@/components/brand/feature-icon";
import { WorkspaceSync } from "@/components/workspace/workspace-sync";
import { MoxieDrawer } from "@/components/moxie/moxie-drawer";
import { FeedbackDialog } from "@/components/workspace/feedback-dialog";
import { cn } from "@/lib/utils";
import {
  getActiveApplication,
  loadWorkspace,
  workspaceUpdatedEvent,
} from "@/modules/workspace/repository";

const sidebarPreferenceKey = "roleward:workspace-sidebar-collapsed";

const navigation = [
  { label: "Home", href: "/dashboard", feature: "home" },
  {
    label: "Applications",
    href: "/dashboard/applications",
    feature: "applications",
  },
  {
    label: "Resume Kitchen",
    href: "/dashboard/resume-kitchen",
    feature: "resume-kitchen",
  },
  {
    label: "Evidence",
    href: "/dashboard/evidence",
    feature: "evidence",
  },
  { label: "Zed", href: "/dashboard/zed", feature: "zed" },
  {
    label: "Stage Fright",
    href: "/dashboard/stage-fright",
    feature: "stage-fright",
  },
  { label: "Moxie", href: "/dashboard/moxie", feature: "moxie" },
] as const satisfies ReadonlyArray<{
  label: string;
  href: string;
  feature: FeatureIconName;
}>;

type WorkspaceUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

function ActiveTarget({ compact = false }: { compact?: boolean }) {
  const [label, setLabel] = useState("No active application");

  useEffect(() => {
    const refresh = () => {
      const app = getActiveApplication(loadWorkspace(localStorage));
      setLabel(
        app ? `${app.companyName} · ${app.roleTitle}` : "No active application",
      );
    };
    queueMicrotask(refresh);
    window.addEventListener(workspaceUpdatedEvent, refresh);
    return () => window.removeEventListener(workspaceUpdatedEvent, refresh);
  }, []);

  if (compact) return null;

  return (
    <Link
      href="/dashboard/applications"
      className="text-dust hover:text-linen mt-2 block truncate text-[11px] transition-colors"
      title={label}
    >
      {label}
    </Link>
  );
}

function initials(user: WorkspaceUser) {
  const source = user.name || user.email || "Roleward";
  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function UserAvatar({ user }: { user: WorkspaceUser }) {
  if (user.image)
    return (
      // Provider avatars can come from several trusted OAuth CDNs.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt=""
        className="size-8 rounded-full object-cover ring-1 ring-white/10"
        referrerPolicy="no-referrer"
        src={user.image}
      />
    );
  return (
    <div className="bg-amber/12 text-amber flex size-8 items-center justify-center rounded-full text-[10px] font-semibold">
      {initials(user) || <UserRound className="size-3.5" />}
    </div>
  );
}

function NavigationLink({
  item,
  pathname,
  compact = false,
  onClick,
}: {
  item: (typeof navigation)[number];
  pathname: string;
  compact?: boolean;
  onClick?: () => void;
}) {
  const active =
    item.href === "/dashboard"
      ? pathname === item.href
      : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={compact ? item.label : undefined}
      aria-label={compact ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex min-h-11 items-center rounded-xl text-sm transition-colors",
        compact ? "justify-center px-2" : "gap-3 px-3",
        active
          ? "bg-linen/[.07] text-linen"
          : "text-canvas hover:bg-linen/[.035] hover:text-linen",
      )}
    >
      <FeatureIcon feature={item.feature} size="sm" active={active} />
      {!compact && <span className="truncate">{item.label}</span>}
      {active && (
        <span className="bg-amber absolute top-2 bottom-2 left-0 w-0.5 rounded-full" />
      )}
    </Link>
  );
}

function SidebarContent({
  compact,
  mobile = false,
  pathname,
  user,
  onNavigate,
  onToggle,
}: {
  compact: boolean;
  mobile?: boolean;
  pathname: string;
  user: WorkspaceUser;
  onNavigate?: () => void;
  onToggle?: () => void;
}) {
  const condensed = mobile ? false : compact;
  const settingsActive = pathname.startsWith("/dashboard/settings");

  return (
    <>
      <div
        className={cn(
          "border-iron/80 relative flex h-[72px] shrink-0 items-center border-b",
          condensed ? "justify-center px-3" : "justify-between px-5",
        )}
      >
        <Logo compact={condensed} href="/dashboard" />
        {mobile ? (
          <button
            type="button"
            onClick={onNavigate}
            className="text-dust hover:text-linen flex size-9 items-center justify-center rounded-lg transition-colors"
            aria-label="Close navigation"
          >
            <X className="size-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggle}
            className={cn(
              "text-dust hover:bg-linen/[.04] hover:text-linen flex size-9 items-center justify-center rounded-lg transition-colors",
              condensed &&
                "bg-workshop border-iron absolute -right-[18px] border shadow-lg",
            )}
            aria-label={condensed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!condensed}
          >
            {condensed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </button>
        )}
      </div>

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-y-auto",
          condensed ? "px-2" : "px-3",
        )}
      >
        {!condensed && (
          <p className="text-dust px-3 pt-7 pb-2 font-mono text-[9px] tracking-[0.13em] uppercase">
            Workspace
          </p>
        )}
        <nav
          className={cn("space-y-1", condensed && "pt-5")}
          aria-label="Workspace navigation"
        >
          {navigation.map((item) => (
            <NavigationLink
              key={item.href}
              item={item}
              pathname={pathname}
              compact={condensed}
              onClick={onNavigate}
            />
          ))}
        </nav>

        <div className="mt-auto pb-4">
          <div
            className={cn(
              "border-iron/80 border-t pt-4",
              condensed ? "flex flex-col items-center gap-3" : "px-3",
            )}
          >
            <WorkspaceSync compact={condensed} />
            <ActiveTarget compact={condensed} />

            <Link
              href="/dashboard/applications/new"
              onClick={onNavigate}
              title={condensed ? "New application" : undefined}
              aria-label={condensed ? "New application" : undefined}
              className={cn(
                "bg-amber text-night hover:bg-amber/90 inline-flex min-h-10 items-center justify-center rounded-xl text-sm font-semibold transition-colors",
                condensed ? "size-10 p-0" : "mt-4 w-full gap-2 px-4",
              )}
            >
              <Plus className="size-4" />
              {!condensed && "New application"}
            </Link>
          </div>

          <div
            className={cn(
              "border-iron/80 mt-4 border-t pt-4",
              condensed ? "flex flex-col items-center gap-3" : "px-3",
            )}
          >
            <div
              className={cn(
                "flex items-center",
                condensed ? "justify-center" : "gap-3",
              )}
            >
              <UserAvatar user={user} />
              {!condensed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">
                    {user.name || user.email?.split("@")[0] || "Your workspace"}
                  </p>
                  <p className="text-dust truncate text-[10px]">{user.email}</p>
                </div>
              )}
            </div>

            <div
              className={cn(
                "mt-3 flex flex-wrap",
                condensed ? "flex-col gap-1" : "items-center gap-1",
              )}
            >
              <FeedbackDialog compact={condensed} onOpen={onNavigate} />
              <Link
                href="/dashboard/settings"
                onClick={onNavigate}
                title={condensed ? "Settings" : undefined}
                aria-label={condensed ? "Settings" : undefined}
                className={cn(
                  "text-dust hover:bg-linen/[.04] hover:text-linen flex min-h-9 items-center rounded-lg text-xs transition-colors",
                  condensed ? "w-9 justify-center" : "flex-1 gap-2 px-2",
                  settingsActive && "bg-linen/[.07] text-linen",
                )}
                aria-current={settingsActive ? "page" : undefined}
              >
                <Settings className="size-3.5" />
                {!condensed && "Settings"}
              </Link>
              <form action={endSession}>
                <button
                  type="submit"
                  title={condensed ? "Log out" : undefined}
                  aria-label="Log out"
                  className={cn(
                    "text-dust hover:bg-linen/[.04] hover:text-linen flex min-h-9 items-center rounded-lg text-xs transition-colors",
                    condensed ? "w-9 justify-center" : "gap-2 px-2",
                  )}
                >
                  <LogOut className="size-3.5" />
                  {!condensed && "Log out"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function MobileNavigation({
  close,
  pathname,
  user,
}: {
  close: () => void;
  pathname: string;
  user: WorkspaceUser;
}) {
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close navigation"
        onClick={close}
      />
      <aside className="bg-workshop border-iron relative flex h-full w-[min(310px,88vw)] flex-col border-r shadow-2xl">
        <SidebarContent
          compact={false}
          mobile
          pathname={pathname}
          user={user}
          onNavigate={close}
        />
      </aside>
    </div>
  );
}

export function WorkspaceShell({
  children,
  user,
}: {
  children: ReactNode;
  user: WorkspaceUser;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setCollapsed(localStorage.getItem(sidebarPreferenceKey) === "true");
    });
  }, []);

  const toggleSidebar = () => {
    setCollapsed((current) => {
      const next = !current;
      localStorage.setItem(sidebarPreferenceKey, String(next));
      return next;
    });
  };

  const isMoxie = pathname.startsWith("/dashboard/moxie");

  return (
    <div
      className={cn(
        "bg-night lg:grid lg:transition-[grid-template-columns] lg:duration-200",
        isMoxie ? "h-dvh overflow-hidden" : "min-h-screen",
        collapsed
          ? "lg:grid-cols-[5rem_minmax(0,1fr)]"
          : "lg:grid-cols-[16rem_minmax(0,1fr)]",
      )}
    >
      <aside className="bg-workshop border-iron/80 relative z-40 hidden h-dvh flex-col border-r lg:sticky lg:top-0 lg:flex">
        <SidebarContent
          compact={collapsed}
          pathname={pathname}
          user={user}
          onToggle={toggleSidebar}
        />
      </aside>

      <div
        className={cn(
          "flex min-w-0 flex-col",
          // Moxie owns the full viewport so its rail and chat can scroll independently.
          isMoxie ? "h-dvh overflow-hidden" : "min-h-screen",
        )}
      >
        <header className="bg-night/90 border-iron/80 sticky top-0 z-40 flex h-16 items-center gap-3 border-b px-4 backdrop-blur-xl sm:px-7 lg:hidden">
          <button
            type="button"
            className="text-canvas hover:text-linen flex size-9 items-center justify-center rounded-lg transition-colors"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
          >
            <Menu className="size-5" />
          </button>
          <Logo compact href="/dashboard" />
          <Link
            href="/dashboard/applications/new"
            className="bg-amber text-night ml-auto inline-flex min-h-9 items-center gap-2 rounded-xl px-3 text-xs font-semibold"
          >
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">New application</span>
            <span className="sm:hidden">New</span>
          </Link>
        </header>

        {mobileOpen && (
          <MobileNavigation
            close={() => setMobileOpen(false)}
            pathname={pathname}
            user={user}
          />
        )}

        <main
          className={cn(
            isMoxie
              ? "min-h-0 flex-1 overflow-hidden p-0"
              : "mx-auto w-full max-w-[1480px] px-4 py-8 sm:px-7 lg:px-10 lg:py-12 xl:px-12",
          )}
        >
          {children}
        </main>
        <MoxieDrawer />
      </div>
    </div>
  );
}
