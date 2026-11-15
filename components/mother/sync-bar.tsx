"use client";

import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { syncNow } from "@/lib/offline/sync";
import { cn } from "@/lib/utils";
import { useSyncState } from "./use-sync-state";

/** Online / offline, how many writes are waiting, and the manual Sync button. */
export function SyncBar() {
  const t = useTranslations("Mother.header");
  const format = useFormatter();
  const { online, syncing, pending, lastSync } = useSyncState();

  return (
    <div className="neu-inset flex items-center gap-3 px-3 py-2">
      <div className="min-w-0 flex-1 text-sm">
        <p className="flex items-center gap-1.5 font-semibold">
          {online ? (
            <Wifi className="size-4 text-[#0a4f49]" aria-hidden />
          ) : (
            <WifiOff className="size-4 text-[#6b4a00]" aria-hidden />
          )}
          {online ? t("online") : t("offline")}
          <span className="font-normal opacity-80">
            {" · "}
            {pending > 0 ? t("waiting", { count: pending }) : t("allSent")}
          </span>
        </p>
        <p className="truncate text-xs opacity-70">
          {lastSync
            ? t("lastSync", {
                time: format.dateTime(new Date(lastSync), {
                  dateStyle: "short",
                  timeStyle: "short",
                }),
              })
            : t("neverSynced")}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void syncNow()}
        disabled={syncing}
        className="neu-raised inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-60"
      >
        <RefreshCw className={cn("size-4", syncing && "animate-spin")} aria-hidden />
        {syncing ? t("syncing") : t("sync")}
      </button>
    </div>
  );
}
