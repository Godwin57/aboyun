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
    <section className="neu-card flex flex-col gap-3 p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Pill className="size-5" aria-hidden />
        {t("title")}
      </h2>
      {row?.tablet ? (
        <>
          <p className="text-lg font-medium">{t("done")}</p>
          <SavedBadge synced={row.tablet.synced} className="w-fit" />
        </>
      ) : (
        <>
          <p className="text-base">{t("prompt")}</p>
          <button
            type="button"
            disabled={!row}
            onClick={() => void confirmTabletToday()}
            className="btn-gradient min-h-14 cursor-pointer rounded-xl px-5 text-lg font-semibold disabled:opacity-60"
          >
            {t("button")}
          </button>
        </>
      )}
    </section>
  );
}
