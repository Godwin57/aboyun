"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Wordmark } from "@/components/brand/wordmark";
import { ClinicNav } from "@/components/clinic/clinic-nav";
import { cn } from "@/lib/utils";

/**
 * Sidebar + content frame for every clinic screen.
 *
 * Large screens: the sidebar stays fixed in place while the page scrolls.
 * Small screens: it is a drawer that slides in from the left, opened and closed with
 * the hamburger button (and closed by the backdrop, Escape, or choosing a link).
 */
export function ClinicShell({
  userName,
  facilityName,
  openEmergencies,
  children,
}: {
  userName: string;
  facilityName: string;
  openEmergencies: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="app-bg min-h-screen lg:flex">
      {/* Small screens: top bar with the hamburger button */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/70 bg-white/80 px-4 py-2.5 backdrop-blur-md lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="clinic-sidebar"
          className="neu-raised inline-flex size-11 flex-none cursor-pointer items-center justify-center rounded-xl"
        >
          <Menu className="size-5" aria-hidden />
        </button>
        <Wordmark />
        {openEmergencies > 0 && (
          <span className="ml-auto inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#b3261e] px-1.5 text-[13px] font-semibold text-white">
            {openEmergencies}
            <span className="sr-only"> open emergencies</span>
          </span>
        )}
      </header>

      {/* Dimmed backdrop behind the open drawer (small screens only) */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-30 bg-[rgba(16,44,40,0.45)] backdrop-blur-[2px] transition-opacity duration-200 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        id="clinic-sidebar"
        aria-label="Sidebar"
        className={cn(
          "glass-sidebar fixed inset-y-0 left-0 z-40 flex w-[280px] max-w-[85vw] flex-col gap-7 overflow-y-auto p-4 pt-6 transition-[transform,visibility] duration-200",
          // Large screens: always visible, and it stays put while the page scrolls.
          "lg:sticky lg:top-0 lg:bottom-auto lg:left-auto lg:z-10 lg:h-screen lg:w-[248px] lg:max-w-none lg:flex-none lg:translate-x-0 lg:self-start",
          // Small screens: slide in and out. Hidden drawers are skipped by keyboard focus.
          open ? "translate-x-0" : "max-lg:invisible max-lg:-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between gap-2 px-2">
          <Wordmark />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="neu-raised inline-flex size-11 flex-none cursor-pointer items-center justify-center rounded-xl lg:hidden"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <ClinicNav openEmergencies={openEmergencies} onNavigate={() => setOpen(false)} />
        <div className="mt-auto flex flex-col gap-2.5 border-t border-[#e6dfd2] px-2 pt-4">
          <div>
            <div className="font-semibold">{userName}</div>
            <div className="text-muted-foreground text-sm">{facilityName}</div>
          </div>
          <SignOutButton className="neu-raised h-11 justify-start gap-2.5 rounded-xl" />
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col gap-6 px-5 py-6 sm:px-10 sm:py-8 sm:pb-12">
        {children}
      </main>
    </div>
  );
}
