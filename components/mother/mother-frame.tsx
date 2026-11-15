"use client";

import { CalendarDays, HeartPulse, House, RefreshCw, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Wordmark } from "@/components/brand/wordmark";
import { LanguageSwitcher } from "@/components/language-switcher";
import { syncNow } from "@/lib/offline/sync";
import { cn } from "@/lib/utils";
import { useSyncState } from "./use-sync-state";

export type MotherView = "home" | "check" | "visits" | "emergency";
type NavView = Exclude<MotherView, "emergency">;

const NAV: { view: NavView; Icon: typeof House }[] = [
  { view: "home", Icon: House },
  { view: "check", Icon: HeartPulse },
  { view: "visits", Icon: CalendarDays },
];

/** Online, offline or how many items are waiting. Tapping it syncs now. */
export function SyncPill({ className }: { className?: string }) {
  const t = useTranslations("Mother.header");
  const { online, syncing, pending } = useSyncState();
  const ok = online && pending === 0;
  return (
    <button
      type="button"
      onClick={() => void syncNow()}
      disabled={syncing}
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-semibold",
        ok ? "bg-[#e3f1ee] text-[#0b4a42]" : "bg-[#fdf1d0] text-[#6b4a00]",
        className,
      )}
    >
      {syncing ? (
        <RefreshCw className="size-4 animate-spin" aria-hidden />
      ) : (
        <span
          className={cn("size-2 rounded-full", ok ? "bg-[#1e8e6e]" : "bg-[#d8901a]")}
          aria-hidden
        />
      )}
      {syncing
        ? t("syncing")
        : pending > 0
          ? t("waiting", { count: pending })
          : online
            ? t("upToDate")
            : t("offline")}
    </button>
  );
}

/**
 * The frame around every mother screen. One navigation, three shapes: a bar at the bottom
 * of a phone, a narrow rail on a tablet and a full sidebar on a computer. The emergency
 * screens drop the bottom bar on a phone so nothing competes with them.
 */
export function MotherFrame({
  view,
  onNavigate,
  children,
}: {
  view: MotherView;
  onNavigate: (view: MotherView) => void;
  children: React.ReactNode;
}) {
  const t = useTranslations("Mother");
  const focused = view === "emergency";
  const showSos = view === "check" || view === "visits";

  const label = (v: NavView) =>
    v === "check" ? (
      <>
        <span className="lg:hidden">{t("nav.check")}</span>
        <span className="hidden lg:inline">{t("check.title")}</span>
      </>
    ) : (
      t(`nav.${v}`)
    );

  return (
    <div className="app-bg flex min-h-dvh flex-col md:flex-row">
      <aside className="glass-sidebar hidden flex-none md:sticky md:top-0 md:flex md:h-dvh md:w-26 md:flex-col md:items-center md:gap-2 md:px-2 md:py-6 lg:w-68 lg:items-stretch lg:px-5 lg:py-7">
        <div className="mb-5 hidden px-2 lg:block">
          <Wordmark />
        </div>
        <span
          aria-hidden
          className="bg-primary relative mb-5 flex size-10 items-center justify-center rounded-full lg:hidden"
        >
          <span className="bg-primary-foreground size-4 rounded-full" />
          <span className="bg-accent absolute right-1 bottom-1 size-2.5 rounded-full" />
        </span>
        <nav aria-label={t("nav.label")} className="flex flex-col gap-2 lg:gap-1.5">
          {NAV.map(({ view: v, Icon }) => {
            const active = view === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => onNavigate(v)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-18 w-22 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl text-sm font-semibold lg:min-h-14 lg:w-full lg:flex-row lg:justify-start lg:gap-3.5 lg:px-4 lg:text-lg",
                  active ? "nav-active font-bold" : "text-[#4a615c] hover:bg-white/70",
                )}
              >
                <Icon className="size-6" aria-hidden />
                {label(v)}
              </button>
            );
          })}
        </nav>
        {showSos && (
          <button
            type="button"
            onClick={() => onNavigate("emergency")}
            className="btn-danger mt-auto flex min-h-16 w-22 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl text-xs font-bold tracking-wide lg:w-full lg:flex-row lg:gap-2.5 lg:text-lg"
          >
            <TriangleAlert className="size-5" aria-hidden />
            {t("home.emergency")}
          </button>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-white/70 bg-white/80 px-4 py-2.5 backdrop-blur-md md:justify-end md:px-8 lg:px-12">
          <div className="md:hidden">
            <Wordmark />
          </div>
          <div className="flex items-center gap-1">
            <SyncPill className="hidden md:inline-flex" />
            <LanguageSwitcher />
            <SignOutButton className="min-h-12 px-3 text-base" />
          </div>
        </header>

        <main
          className={cn(
            "mx-auto w-full max-w-6xl flex-1 px-4 pt-5 md:px-8 md:pt-8 lg:px-12 lg:pt-10",
            focused ? "pb-10" : "pb-44 md:pb-12",
          )}
        >
          {children}
        </main>

        {!focused && (
          <div className="fixed inset-x-0 bottom-0 z-30 md:hidden">
            {showSos && (
              <button
                type="button"
                onClick={() => onNavigate("emergency")}
                className="mx-4 mb-2 flex min-h-14 w-[calc(100%-2rem)] cursor-pointer items-center justify-center gap-2.5 rounded-2xl bg-[#fbe3de] text-base font-bold text-[#8f1d0e]"
              >
                <TriangleAlert className="size-5" aria-hidden />
                {t("emergency.inDanger")}
              </button>
            )}
            <nav
              aria-label={t("nav.label")}
              className="flex justify-around border-t border-[#e9e4d8] bg-white px-3 pt-2 pb-3"
            >
              {NAV.map(({ view: v, Icon }) => {
                const active = view === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => onNavigate(v)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-14 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 text-sm",
                      active
                        ? "font-bold text-[#0f6a5f]"
                        : "font-semibold text-[#4a615c]",
                    )}
                  >
                    <span
                      className={cn(
                        "flex rounded-full px-5 py-1",
                        active && "bg-[#e3f1ee]",
                      )}
                    >
                      <Icon className="size-6" aria-hidden />
                    </span>
                    {t(`nav.${v}`)}
                  </button>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
