"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Siren } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { getDb, type HomeSnapshot } from "@/lib/offline/db";
import { syncNow } from "@/lib/offline/sync";
import { gestationalAge, startOfUtcDay } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { EmergencyPanel } from "./emergency-panel";
import { InstallPrompt } from "./install-prompt";
import { MotherFrame, SyncPill, type MotherView } from "./mother-frame";
import { SymptomCheck } from "./symptom-check";
import { TabletCard } from "./tablet-card";
import { useSyncState } from "./use-sync-state";
import { VisitsView } from "./visits-view";

const DAY_MS = 86_400_000;
const FULL_TERM_WEEKS = 40;
const RING = 2 * Math.PI * 44;

/**
 * The whole mother app is this one page. Moving between home, symptom check, visits and
 * emergency happens on the phone, so every screen opens offline from the cached page.
 */
export function MotherHome() {
  const [view, setView] = useState<MotherView>("home");

  const data = useLiveQuery(async () => {
    const db = getDb();
    const home = ((await db.meta.get("home"))?.value ?? null) as HomeSnapshot | null;
    return { home };
  }, []);

  const home = data?.home ?? null;
  const contact = home
    ? {
        name: home.mother.name,
        clinicName: home.facility.name,
        phone: home.facility.phone,
      }
    : null;

  const back = () => setView("home");

  return (
    <MotherFrame view={view} onNavigate={setView}>
      {view === "home" && (
        <HomeView
          loaded={data !== undefined}
          home={home}
          onEmergency={() => setView("emergency")}
        />
      )}
      {view === "check" && (
        <SymptomCheck
          contact={contact}
          onBack={back}
          onEmergency={() => setView("emergency")}
        />
      )}
      {view === "visits" && <VisitsView facilityName={home?.facility.name ?? null} />}
      {view === "emergency" && <EmergencyPanel contact={contact} onBack={back} />}
    </MotherFrame>
  );
}

function ProgressRing({ weeks, label }: { weeks: number; label: string }) {
  const done = Math.min(Math.max(weeks, 0), FULL_TERM_WEEKS) / FULL_TERM_WEEKS;
  return (
    <div className="relative size-28 flex-none md:size-32 lg:size-36">
      <svg viewBox="0 0 104 104" role="img" aria-label={label} className="size-full">
        <circle
          cx="52"
          cy="52"
          r="44"
          fill="none"
          stroke="rgba(251,249,244,0.22)"
          strokeWidth="9"
        />
        <circle
          cx="52"
          cy="52"
          r="44"
          fill="none"
          stroke="#f2b544"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${RING * done} ${RING}`}
          transform="rotate(-90 52 52)"
        />
      </svg>
      <span className="font-heading absolute inset-0 flex items-center justify-center text-4xl font-semibold text-white md:text-[2.5rem]">
        {weeks}
      </span>
    </div>
  );
}

function HomeView({
  loaded,
  home,
  onEmergency,
}: {
  loaded: boolean;
  home: HomeSnapshot | null;
  onEmergency: () => void;
}) {
  const t = useTranslations("Mother.home");
  const tRisk = useTranslations("Mother.risk");
  const format = useFormatter();
  const { online, syncing } = useSyncState();

  const loadedVisits = useLiveQuery(
    () => getDb().visits.orderBy("dueDate").toArray(),
    [],
  );

  const visits = loadedVisits ?? [];
  const today = startOfUtcDay(new Date());
  const nextVisit = visits.find((v) => !v.attendedAt);
  const nextDate = nextVisit ? new Date(nextVisit.dueDate) : null;
  const daysToVisit = nextDate
    ? Math.round((startOfUtcDay(nextDate).getTime() - today.getTime()) / DAY_MS)
    : null;
  const weeks =
    home?.mother.status === "PREGNANT"
      ? gestationalAge(new Date(home.mother.lmp), today).weeks
      : null;
  const risk = home?.mother.riskLevel ?? "LOW";

  let visitWhen: string | null = null;
  if (daysToVisit !== null) {
    visitWhen =
      daysToVisit < 0
        ? t("passed")
        : daysToVisit === 0
          ? t("today")
          : daysToVisit === 1
            ? t("tomorrow")
            : t("inDays", { days: daysToVisit });
  }

  const riskTone = {
    LOW: { box: "bg-[#e3f1ee] text-[#0b3d38]", dot: "bg-[#1e8e6e]" },
    MEDIUM: { box: "bg-[#fdf1d0] text-[#5c3f00]", dot: "bg-[#d8901a]" },
    HIGH: { box: "bg-[#fbe3de] text-[#8f1d0e]", dot: "bg-[#b02512]" },
  }[risk];

  return (
    <div className="flex flex-col gap-5 lg:gap-7">
      <div className="flex justify-end md:hidden">
        <SyncPill />
      </div>

      {!loaded ? (
        <p className="p-4 text-lg">{t("loading")}</p>
      ) : !home ? (
        <>
          <EmergencyButton onClick={onEmergency} />
          <section className="neu-card flex flex-col gap-3 p-5">
            <p className="text-lg">{syncing ? t("loading") : t("needsConnection")}</p>
            <button
              type="button"
              disabled={syncing || !online}
              onClick={() => void syncNow()}
              className="btn-gradient min-h-12 cursor-pointer rounded-xl px-5 text-base font-semibold disabled:opacity-60"
            >
              {t("retry")}
            </button>
          </section>
        </>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2 lg:items-stretch lg:gap-7">
          <div className="flex flex-col gap-5 lg:gap-7">
            <section className="hero-banner flex items-center justify-between gap-4 rounded-[28px] p-5 text-white md:p-7 lg:flex-1 lg:p-9">
              <div className="flex min-w-0 flex-col gap-1.5">
                <p className="text-base opacity-90 md:text-lg">{t("hello")}</p>
                <h1 className="font-heading text-3xl leading-tight font-semibold wrap-break-word md:text-4xl lg:text-5xl">
                  {home.mother.name}
                </h1>
                <p className="mt-1 text-lg font-medium md:text-xl lg:text-2xl">
                  {weeks !== null
                    ? t("weeksToGo", { weeks: Math.max(FULL_TERM_WEEKS - weeks, 0) })
                    : t("postnatal")}
                </p>
              </div>
              {weeks !== null && (
                <ProgressRing weeks={weeks} label={t("weeks", { weeks })} />
              )}
            </section>
            <EmergencyButton onClick={onEmergency} />
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-1 lg:content-start lg:gap-7">
            <section className="neu-card flex min-h-28 items-center gap-4 p-5 md:p-6">
              {loadedVisits === undefined ? null : nextDate && visitWhen ? (
                <>
                  <div className="flex h-18 w-16 flex-none flex-col items-center justify-center rounded-2xl bg-[#e3f1ee] text-[#0a4f49] md:h-20 md:w-18">
                    <span className="text-xs font-semibold uppercase md:text-sm">
                      {format.dateTime(nextDate, { month: "short", timeZone: "UTC" })}
                    </span>
                    <span className="font-heading text-3xl leading-none font-semibold md:text-4xl">
                      {format.dateTime(nextDate, { day: "numeric", timeZone: "UTC" })}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <h2 className="text-muted-foreground text-sm font-medium md:text-base">
                      {t("nextVisit")}
                    </h2>
                    <p
                      className={cn(
                        "text-xl font-semibold md:text-2xl",
                        daysToVisit! < 0 && "text-[#8f1d0e]",
                      )}
                    >
                      {daysToVisit! < 0
                        ? visitWhen
                        : `${format.dateTime(nextDate, { weekday: "long", timeZone: "UTC" })}, ${visitWhen.toLowerCase()}`}
                    </p>
                    <p className="text-muted-foreground text-sm md:text-base">
                      {home.facility.name}
                    </p>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-1">
                  <h2 className="text-muted-foreground text-sm font-medium md:text-base">
                    {t("nextVisit")}
                  </h2>
                  <p className="text-lg">{t("noVisit")}</p>
                </div>
              )}
            </section>

            <TabletCard />

            <section
              className={cn(
                "flex items-start gap-3 rounded-[22px] p-5 md:col-span-2 md:p-6 lg:col-span-1",
                riskTone.box,
              )}
            >
              <span
                className={cn("mt-2 size-3 flex-none rounded-full", riskTone.dot)}
                aria-hidden
              />
              <p className="text-base leading-snug md:text-lg">
                <strong className="font-semibold">{tRisk(`${risk}.title`)}.</strong>{" "}
                {tRisk(`${risk}.body`)}
              </p>
            </section>
          </div>
        </div>
      )}

      <InstallPrompt />
    </div>
  );
}

/** The emergency button comes first and works with or without a connection. */
function EmergencyButton({ onClick }: { onClick: () => void }) {
  const t = useTranslations("Mother.home");
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn-danger flex min-h-24 w-full cursor-pointer items-center justify-center gap-4 rounded-[26px] px-5 py-4 text-left md:min-h-28 md:gap-5 lg:min-h-32"
    >
      <Siren className="size-10 flex-none md:size-12" aria-hidden />
      <span className="flex flex-col gap-0.5">
        <span className="text-3xl font-bold tracking-wide md:text-4xl">
          {t("emergency")}
        </span>
        <span className="text-base font-medium md:text-lg">{t("emergencyHint")}</span>
      </span>
    </button>
  );
}
