"use client";

import { Check, Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";
import type { SyncFlag } from "@/lib/offline/db";
import { cn } from "@/lib/utils";

/** "Saved on this device" or "Synced", shown on every record she makes. */
export function SavedBadge({
  synced,
  className,
}: {
  synced: SyncFlag;
  className?: string;
}) {
  const t = useTranslations("Mother.badge");
  const onServer = synced === 1;
  const Icon = onServer ? Check : Smartphone;
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold",
        onServer ? "bg-[#e3f1ee] text-[#0a4f49]" : "bg-[#fdf1d0] text-[#6b4a00]",
        className,
      )}
    >
      <Icon className="size-3.5" strokeWidth={2.4} aria-hidden />
      {onServer ? t("synced") : t("device")}
    </span>
  );
}
