"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { signOutAndClear } from "@/components/auth/sign-out-button";
import { startSync } from "@/lib/offline/sync";
import { useSyncState } from "./use-sync-state";

/** Wires up offline sync and the 7-day sign-in gate. The screens draw their own frame. */
export function MotherShell({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("Mother.session");
  const router = useRouter();
  const { signInRequired } = useSyncState();

  useEffect(() => startSync(userId), [userId]);

  if (!signInRequired) return children;

  return (
    <div className="app-bg flex min-h-dvh items-center justify-center p-4">
      <section className="neu-card flex w-full max-w-xl flex-col gap-3 p-5" role="alert">
        <h1 className="font-heading text-2xl font-semibold">{t("expiredTitle")}</h1>
        <p className="text-lg">{t("expiredBody")}</p>
        <button
          type="button"
          onClick={async () => {
            await signOutAndClear();
            router.replace("/login");
          }}
          className="btn-gradient min-h-14 cursor-pointer rounded-xl px-5 text-lg font-semibold"
        >
          {t("signIn")}
        </button>
      </section>
    </div>
  );
}
