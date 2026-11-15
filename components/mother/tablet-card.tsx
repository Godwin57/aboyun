"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Pill } from "lucide-react";
import { useTranslations } from "next-intl";
import { confirmTabletToday } from "@/lib/offline/actions";
import { getDb, localDay } from "@/lib/offline/db";
import { SavedBadge } from "./saved-badge";

/** "I took my tablet today": saved on the phone at once, one tick per day. */
export function TabletCard() {
  const t = useTranslations("Mother.tablet");
  const today = localDay();
  const row = useLiveQuery(
    async () => ({ tablet: (await getDb().tablets.get(today)) ?? null }),
    [today],
  );

  return (
    <section className="neu-card flex flex-col gap-4 p-5 md:p-6">
      <div className="flex items-center gap-3">
        <span
          className="flex size-11 flex-none items-center justify-center rounded-full bg-[#fceac8] text-[#7a5200]"
          aria-hidden
        >
          <Pill className="size-5" />
        </span>
        <h2 className="text-lg font-semibold md:text-xl">{t("title")}</h2>
      </div>
      {row?.tablet ? (
        <>
          <p className="text-lg font-medium">{t("done")}</p>
          <SavedBadge synced={row.tablet.synced} className="w-fit" />
        </>
      ) : (
        <>
          <p className="text-base md:text-lg">{t("prompt")}</p>
          <button
            type="button"
            disabled={!row}
            onClick={() => void confirmTabletToday()}
            className="btn-gradient min-h-14 cursor-pointer rounded-2xl px-5 text-lg font-semibold disabled:opacity-60"
          >
            {t("button")}
          </button>
        </>
      )}
    </section>
  );
}
