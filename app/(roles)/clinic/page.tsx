import { ChevronRight, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { RiskBadge } from "@/components/clinic/risk-badge";
import { StatCard } from "@/components/clinic/stat-card";
import { requireRole } from "@/lib/auth";
import {
  formatDay,
  formatDayNumber,
  formatShort,
  formatWeekday,
  relativeDays,
  timeAgo,
} from "@/lib/format";
import {
  getClinicShellInfo,
  getDashboard,
  type AttentionItem,
} from "@/lib/services/dashboard";

export const metadata: Metadata = { title: "Dashboard" };

const EMERGENCY_KIND = {
  BLEEDING: "bleeding",
  LABOUR: "labour",
  FITS: "fits",
  BABY: "a problem with the baby",
  OTHER: "an emergency",
} as const;

const SOURCE = { APP: "the app", USSD: "USSD", SMS: "SMS" } as const;

const longDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Lagos",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Lagos",
      hour: "numeric",
      hourCycle: "h23",
    }).format(new Date()),
  );
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

function attentionText(item: AttentionItem) {
  if (item.kind === "overdue") {
    return `Contact ${item.contactNo ?? "?"} was due ${item.dueDate ? formatDay(item.dueDate) : "earlier"}. She has not come yet.`;
  }
  const when = item.since ? `Flagged ${relativeDays(item.since)}` : "Flagged";
  if (item.kind === "refer") {
    return `${item.reason}. ${when}${item.referred ? ", already referred." : ", not yet referred."}`;
  }
  return `${item.reason}. ${when}.`;
}

export default async function ClinicDashboard() {
  const session = await requireRole("CLINIC");
  const [data, info] = await Promise.all([
    getDashboard(session),
    getClinicShellInfo(session),
  ]);
  const { totals } = data;
  const emergency = data.emergencies[0];

  return (
    <>
      <header className="hero-banner flex flex-wrap items-end justify-between gap-4 rounded-[26px] px-8 py-7 text-white">
        <div>
          <div className="text-sm text-white/90">{longDate.format(new Date())}</div>
          <h1 className="font-heading mt-1 text-4xl leading-tight font-semibold">
            {greeting()}, {info.userName}
          </h1>
        </div>
        <Link
          href="/clinic/mothers?register=1"
          className="inline-flex min-h-12 items-center gap-2.5 rounded-xl bg-white px-5 text-base font-semibold text-[#0a4f49] shadow-[0_10px_22px_rgba(0,0,0,0.18)]"
        >
          Register a mother
        </Link>
      </header>

      {emergency && (
        <section
          aria-label="Open emergency"
          className="alert-danger flex flex-wrap items-center gap-4 px-5 py-[18px]"
        >
          <span className="inline-flex size-11 flex-none items-center justify-center rounded-full bg-[#b3261e] text-white">
            <TriangleAlert className="size-6" aria-hidden />
          </span>
          <div className="min-w-0 flex-[1_1_320px]">
            <div className="text-[17px] font-semibold text-[#8c1d18]">
              {data.emergencies.length} open{" "}
              {data.emergencies.length === 1 ? "emergency" : "emergencies"}:{" "}
              {EMERGENCY_KIND[emergency.kind]}
            </div>
            <div className="text-[#5c2420]">
              {emergency.motherName}, {emergency.weeks} weeks. Reported by{" "}
              {SOURCE[emergency.source]} {timeAgo(emergency.createdAt)}. Nobody has
              acknowledged it yet.
            </div>
          </div>
          <Link
            href="/clinic/emergencies"
            className="btn-danger inline-flex min-h-12 items-center rounded-xl px-5 font-semibold"
          >
            Open emergency
          </Link>
        </section>
      )}

      <section
        aria-label="Summary"
        className="grid [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] gap-4"
      >
        <StatCard
          label="Mothers registered"
          value={totals.mothers}
          note={`${totals.pregnant} pregnant, ${totals.postnatal} postnatal`}
        />
        <StatCard
          label="High risk"
          value={totals.high}
          note={
            totals.needReferral > 0
              ? `${totals.needReferral} need a referral`
              : "None waiting for a referral"
          }
        />
        <StatCard
          label="Visits due soon"
          value={totals.dueSoon}
          note={`${formatShort(data.windowStart)} to ${formatShort(data.windowEnd)}`}
        />
        <StatCard
          label="Overdue visits"
          value={totals.overdue}
          note="Mothers who missed a visit"
        />
      </section>

      <div className="flex flex-wrap items-start gap-6">
        <section
          aria-labelledby="attn"
          className="neu-card min-w-0 flex-[3_1_480px] overflow-hidden"
        >
          <div className="flex items-baseline justify-between gap-3 px-6 pt-5 pb-3">
            <h2 id="attn" className="font-heading text-[22px] font-semibold">
              Needs attention
            </h2>
            <Link
              href="/clinic/mothers"
              className="font-medium text-[#0f6b63] hover:text-[#0a4f49]"
            >
              All mothers
            </Link>
          </div>
          {data.attention.length === 0 ? (
            <p className="text-muted-foreground border-t border-[#e6dfd2] px-6 py-8">
              Nobody needs attention right now.
            </p>
          ) : (
            <ul>
              {data.attention.map((item) => (
                <li
                  key={`${item.kind}-${item.motherId}`}
                  className="border-t border-[#e6dfd2]"
                >
                  <Link
                    href={`/clinic/mothers/${item.motherId}`}
                    className="flex min-h-11 items-center gap-4 px-6 py-4 hover:bg-white/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-base font-semibold">{item.name}</span>
                        {item.kind === "refer" ? (
                          <RiskBadge
                            level="HIGH"
                            label={item.referred ? "Referred" : "Refer now"}
                          />
                        ) : (
                          <RiskBadge
                            level="MEDIUM"
                            label={
                              item.kind === "overdue" ? "Missed visit" : "Medium risk"
                            }
                          />
                        )}
                      </div>
                      <div className="text-muted-foreground mt-1">
                        {attentionText(item)}
                      </div>
                    </div>
                    <ChevronRight
                      className="text-muted-foreground size-5 flex-none"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          aria-labelledby="week"
          className="neu-card min-w-0 flex-[2_1_340px] overflow-hidden"
        >
          <div className="px-6 pt-5 pb-3">
            <h2 id="week" className="font-heading text-[22px] font-semibold">
              Visits due soon
            </h2>
            <div className="text-muted-foreground mt-0.5 text-sm">
              Antenatal contacts due {formatDay(data.windowStart)} to{" "}
              {formatDay(data.windowEnd)}
            </div>
          </div>
          {data.upcoming.length === 0 ? (
            <p className="text-muted-foreground border-t border-[#e6dfd2] px-6 py-8">
              No visits due in the next few days.
            </p>
          ) : (
            <ul>
              {data.upcoming.map((v) => (
                <li
                  key={`${v.motherId}-${v.contactNo}`}
                  className="border-t border-[#e6dfd2]"
                >
                  <Link
                    href={`/clinic/mothers/${v.motherId}`}
                    className="flex min-h-11 items-center gap-4 px-6 py-3.5 hover:bg-white/50"
                  >
                    <div className="w-[52px] flex-none text-center">
                      <div className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                        {formatWeekday(v.dueDate)}
                      </div>
                      <div className="font-heading text-2xl leading-tight font-semibold">
                        {formatDayNumber(v.dueDate)}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{v.name}</div>
                      <div className="text-muted-foreground text-sm">
                        Contact {v.contactNo ?? "?"} of 8
                        {v.week ? `, ${v.week} weeks` : ""}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
