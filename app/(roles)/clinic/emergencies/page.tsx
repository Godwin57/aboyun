import { Phone, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AutoRefresh } from "@/components/clinic/auto-refresh";
import { EmergencyActions } from "@/components/clinic/emergency-actions";
import { requireRole } from "@/lib/auth";
import { formatDay, timeAgo } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import {
  EMERGENCY_KIND_TEXT,
  listEmergencies,
  type EmergencyView,
} from "@/lib/services/emergency";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Emergencies" };

const SOURCE = { APP: "the app", USSD: "USSD", SMS: "SMS" } as const;

const STATUS = {
  OPEN: { label: "Open", className: "bg-[#fbe7e4] text-[#8c1d18]" },
  ACKNOWLEDGED: { label: "Acknowledged", className: "bg-[#fdf1d0] text-[#6b4a00]" },
  REFERRED: { label: "Referred", className: "bg-[#e3f1ee] text-[#0a4f49]" },
  CLOSED: { label: "Closed", className: "bg-[#efece4] text-[#5a6b67]" },
} as const;

function sentence(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function EmergencyCard({ e }: { e: EmergencyView }) {
  const open = e.status === "OPEN";
  const status = STATUS[e.status];
  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-5 px-6 py-5",
        open ? "alert-danger" : "neu-card",
      )}
    >
      <span
        className={cn(
          "inline-flex size-12 flex-none items-center justify-center rounded-full",
          open ? "bg-[#b3261e] text-white" : "bg-[#efece4] text-[#5a6b67]",
        )}
      >
        <TriangleAlert className="size-6" aria-hidden />
      </span>

      <div className="min-w-0 flex-[1_1_320px]">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className={cn("text-xl font-semibold", open && "text-[#8c1d18]")}>
            {sentence(EMERGENCY_KIND_TEXT[e.kind])}
          </h2>
          <span
            className={cn(
              "inline-flex h-7 items-center rounded-full px-3 text-[13px] font-semibold",
              status.className,
            )}
          >
            {status.label}
          </span>
        </div>
        <p className={cn("mt-1", open ? "text-[#5c2420]" : "text-muted-foreground")}>
          <Link
            href={`/clinic/mothers/${e.motherId}`}
            className="font-semibold underline underline-offset-2"
          >
            {e.motherName}
          </Link>
          {e.weeks !== null ? `, ${e.weeks} weeks` : ""}. Reported by {SOURCE[e.source]}{" "}
          {timeAgo(e.createdAt)}.
          {e.status === "ACKNOWLEDGED" && e.acknowledgedAt
            ? ` Acknowledged ${timeAgo(e.acknowledgedAt)}.`
            : ""}
          {e.status === "REFERRED" && e.referredTo ? ` Sent to ${e.referredTo}.` : ""}
          {e.status === "CLOSED" && e.closedAt ? ` Closed ${formatDay(e.closedAt)}.` : ""}
        </p>
        {e.motherPhone && e.status !== "CLOSED" && (
          <a
            href={`tel:${e.motherPhone}`}
            className="mt-2 inline-flex min-h-11 items-center gap-2 font-semibold text-[#0f6b63]"
          >
            <Phone className="size-[18px]" aria-hidden />
            Call {formatPhone(e.motherPhone)}
          </a>
        )}
      </div>

      <EmergencyActions id={e.id} status={e.status} />
    </li>
  );
}

export default async function EmergenciesPage() {
  const session = await requireRole("CLINIC");
  const { active, closed } = await listEmergencies(session);

  return (
    <>
      <AutoRefresh seconds={10} />

      <header>
        <h1 className="font-heading text-4xl leading-tight font-semibold">Emergencies</h1>
        <p className="text-muted-foreground mt-1">
          Raised by mothers and their families from the app, USSD or SMS. This page
          updates by itself.
        </p>
      </header>

      {active.length === 0 ? (
        <p className="neu-card text-muted-foreground px-6 py-10 text-center">
          No open emergencies. New ones appear here as soon as they are raised.
        </p>
      ) : (
        <ul className="flex flex-col gap-4" aria-label="Open emergencies">
          {active.map((e) => (
            <EmergencyCard key={e.id} e={e} />
          ))}
        </ul>
      )}

      {closed.length > 0 && (
        <section aria-labelledby="closed" className="flex flex-col gap-3">
          <h2 id="closed" className="font-heading text-[22px] font-semibold">
            Closed in the last 7 days
          </h2>
          <ul className="flex flex-col gap-3">
            {closed.map((e) => (
              <EmergencyCard key={e.id} e={e} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
