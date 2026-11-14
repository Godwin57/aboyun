"use client";

import { LayoutDashboard, TriangleAlert, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/clinic", label: "Dashboard", Icon: LayoutDashboard, exact: true },
  { href: "/clinic/mothers", label: "Mothers", Icon: Users, exact: false },
  {
    href: "/clinic/emergencies",
    label: "Emergencies",
    Icon: TriangleAlert,
    exact: false,
  },
] as const;

export function ClinicNav({
  openEmergencies,
  onNavigate,
}: {
  openEmergencies: number;
  /** Called when a link is chosen, so the mobile menu can close. */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {ITEMS.map(({ href, label, Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-xl px-3 font-medium transition-colors",
              active ? "nav-active font-semibold" : "text-foreground hover:bg-white/60",
            )}
          >
            <Icon className="size-5" aria-hidden />
            <span className="flex-1">{label}</span>
            {href === "/clinic/emergencies" && openEmergencies > 0 && (
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#b3261e] px-1.5 text-[13px] font-semibold text-white">
                {openEmergencies}
                <span className="sr-only"> open</span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
