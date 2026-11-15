"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Check } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { getDb } from "@/lib/offline/db";
import { startOfUtcDay } from "@/lib/schedule";
import { cn } from "@/lib/utils";

const DAY_MS = 86_400_000;

/** Every clinic visit: the ones done, the next one, and the ones still to come. */
export function VisitsView({ facilityName }: { facilityName: string | null }) {
  const t = useTranslations("Mother.visits");
  const tHome = useTranslations("Mother.home");
  const format = useFormatter();
  const loaded = useLiveQuery(() => getDb().visits.orderBy("dueDate").toArray(), []);

  const visits = loaded ?? [];
  const done = visits.filter((v) => v.attendedAt).length;
  const next = visits.find((v) => !v.attendedAt);
  const nextDate = next ? new Date(next.dueDate) : null;
  const days = nextDate
    ? Math.round(
        (startOfUtcDay(nextDate).getTime() - startOfUtcDay(new Date()).getTime()) /
          DAY_MS,
      )
    : null;
  const when =
    days === null
      ? null
      : days < 0
        ? tHome("passed")
        : days === 0
          ? tHome("today")
          : days === 1
            ? tHome("tomorrow")
            : tHome("inDays", { days });

  const label = (v: (typeof visits)[number]) =>
    v.kind === "PNC" || v.contactNo === null
      ? t("postnatal")
      : t("visit", { n: v.contactNo });
  const date = (iso: string, long = false) =>
    format.dateTime(new Date(iso), {
      dateStyle: long ? "full" : "long",
      timeZone: "UTC",
    });

  if (loaded === undefined) return null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 md:gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-heading text-3xl font-semibold md:text-4xl lg:text-5xl">
          {t("title")}
        </h1>
        {visits.length > 0 && (
          <p className="text-lg md:text-xl">
            {t("progress", { done, total: visits.length })}
          </p>
        )}
      </div>

      {visits.length === 0 ? (
        <p className="neu-card p-5 text-lg">{t("none")}</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
          <ol className="neu-card flex flex-col px-5 py-2 md:px-7">
            {visits.map((v) => {
              const isDone = Boolean(v.attendedAt);
              const isNext = next?.id === v.id;
              return (
                <li
                  key={v.id}
                  aria-current={isNext ? "step" : undefined}
                  className="flex items-center gap-4 border-b border-[#efeae0] py-4 last:border-b-0 md:gap-5"
                >
                  <span
                    className={cn(
                      "flex size-9 flex-none items-center justify-center rounded-full",
                      isDone && "bg-[#1e8e6e] text-white",
                      isNext && "bg-[#0f6a5f] ring-[6px] ring-[#cfe6e2]",
                      !isDone && !isNext && "border-[3px] border-[#b9c7c3]",
                    )}
                    aria-hidden
                  >
                    {isDone && <Check className="size-5" strokeWidth={3} />}
                    {isNext && <span className="size-3 rounded-full bg-white" />}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <span
                      className={cn(
                        "text-lg font-semibold md:text-xl",
                        isNext ? "text-[#0f6a5f]" : !isDone && "text-[#4a615c]",
                      )}
                    >
                      {label(v)}
                    </span>
                    <span
                      className={cn(
                        "text-muted-foreground text-sm md:text-base",
                        isNext && "font-semibold text-[#0f6a5f]",
                      )}
                    >
                      {isDone
                        ? t("doneOn", { date: date(v.attendedAt!) })
                        : date(v.dueDate)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>

          {next && nextDate && when && (
            <section className="hero-banner flex flex-col gap-2 rounded-[28px] p-6 text-white md:p-8 lg:sticky lg:top-24">
              <h2 className="text-sm font-bold tracking-wider uppercase opacity-90">
                {t("next")}
              </h2>
              <p className="font-heading text-3xl leading-tight font-semibold md:text-4xl">
                {date(next.dueDate, true)}
              </p>
              <p className="text-lg md:text-xl">{when}</p>
              {facilityName && (
                <p className="mt-1 text-base opacity-90 md:text-lg">{facilityName}</p>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
