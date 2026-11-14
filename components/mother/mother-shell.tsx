"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { signOutAndClear, SignOutButton } from "@/components/auth/sign-out-button";
import { Wordmark } from "@/components/brand/wordmark";
import { LanguageSwitcher } from "@/components/language-switcher";
import { startSync } from "@/lib/offline/sync";
import { useSyncState } from "./use-sync-state";

/** Frame for every mother screen: header, offline sync wiring, and the 7-day sign-in gate. */
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

  return (
    <div className="app-bg min-h-screen">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-white/70 bg-white/80 px-4 py-2.5 backdrop-blur-md">
        <Wordmark />
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <SignOutButton className="min-h-12 px-3 text-base" />
        </div>
      </header>
      <main className="mx-auto w-full max-w-xl px-4 pt-4 pb-10">
        {signInRequired ? (
          <section className="neu-card flex flex-col gap-3 p-5" role="alert">
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
        ) : (
          children
        )}
      </main>
    </div>
  );
}
