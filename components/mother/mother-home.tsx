"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { CalendarDays, HeartPulse, Siren } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { getDb, type HomeSnapshot } from "@/lib/offline/db";
import { syncNow } from "@/lib/offline/sync";
import { gestationalAge, startOfUtcDay } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { EmergencyPanel } from "./emergency-panel";
import { InstallPrompt } from "./install-prompt";
import { SymptomCheck } from "./symptom-check";
import { SyncBar } from "./sync-bar";
import { TabletCard } from "./tablet-card";
import { useSyncState } from "./use-sync-state";

type View = "home" | "check" | "emergency";
const DAY_MS = 86_400_000;

/**
 * The whole mother app is this one page. Switching between home, symptom check and
 * emergency happens on the phone, so every screen opens offline from the cached page.
 */
export function MotherHome() {
  const t = useTranslations("Mother.home");
  const tRisk = useTranslations("Mother.risk");
  const format = useFormatter();
  const { online, syncing } = useSyncState();
  const [view, setView] = useState<View>("home");

  const data = useLiveQuery(async () => {
    const db = getDb();
    const home = ((await db.meta.get("home"))?.value ?? null) as HomeSnapshot | null;
    const visits = await db.visits.orderBy("dueDate").toArray();
    return { home, visits };
  }, []);

  const home = data?.home ?? null;
  const contact = home
    ? {
        name: home.mother.name,
        clinicName: home.facility.name,
        phone: home.facility.phone,
      }
    : null;

  if (view === "check") return <SymptomCheck onBack={() => setView("home")} />;
  if (view === "emergency") {
    return <EmergencyPanel contact={contact} onBack={() => setView("home")} />;
  }

  const today = startOfUtcDay(new Date());
  const nextVisit = data?.visits.find((v) => !v.attendedAt);
  const daysToVisit = nextVisit
    ? Math.round(
        (startOfUtcDay(new Date(nextVisit.dueDate)).getTime() - today.getTime()) / DAY_MS,
      )
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

  return (
    <div className="flex flex-col gap-4">
      {/* The emergency button comes first and works with or without a connection. */}
      <button
        type="button"
        onClick={() => setView("emergency")}
        className="btn-danger flex min-h-28 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-3xl px-5 py-4"
      >
        <span className="flex items-center gap-3 text-3xl font-bold tracking-wide">
          <Siren className="size-8" aria-hidden />
          {t("emergency")}
        </span>
        <span className="text-base opacity-95">{t("emergencyHint")}</span>
      </button>

      {data === undefined ? (
        <p className="p-4 text-lg">{t("loading")}</p>
      ) : !home ? (
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
      ) : (
        <>
          <section className="hero-banner rounded-3xl p-5 text-white">
            <h1 className="font-heading text-2xl font-semibold">
              {t("greeting", { name: home.mother.name })}
            </h1>
            <p className="mt-1 text-lg opacity-95">
              {weeks !== null ? t("weeks", { weeks }) : t("postnatal")}
            </p>
          </section>

          <section className="neu-card flex flex-col gap-2 p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <CalendarDays className="size-5" aria-hidden />
              {t("nextVisit")}
            </h2>
            {nextVisit && visitWhen ? (
              <>
                <p className="text-2xl font-semibold">
                  {format.dateTime(new Date(nextVisit.dueDate), {
                    dateStyle: "full",
                    timeZone: "UTC",
                  })}
                </p>
                <p className={cn("text-lg", daysToVisit! < 0 && "font-semibold")}>
                  {visitWhen}
                </p>
                <p className="opacity-80">{t("at", { facility: home.facility.name })}</p>
              </>
            ) : (
              <p className="text-lg">{t("noVisit")}</p>
            )}
          </section>

          <section className="neu-card flex flex-col gap-1 p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <HeartPulse className="size-5" aria-hidden />
              {tRisk(`${risk}.title`)}
            </h2>
            <p className="text-lg">{tRisk(`${risk}.body`)}</p>
          </section>

          <TabletCard />
        </>
      )}

      <button
        type="button"
        onClick={() => setView("check")}
        className="neu-card flex min-h-20 w-full cursor-pointer flex-col items-start justify-center gap-0.5 px-5 py-3 text-left"
      >
        <span className="text-xl font-semibold">{t("checkTitle")}</span>
        <span className="text-base opacity-80">{t("checkHint")}</span>
      </button>

      <SyncBar />
      <InstallPrompt />
    </div>
  );
}
