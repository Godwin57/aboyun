import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Wordmark } from "@/components/brand/wordmark";
import { OfflineRetry } from "@/components/mother/offline-retry";

// Shown by the service worker when a page is not saved and there is no connection.
// It is precached, so it must not need the database or a session.
export default async function OfflinePage() {
  const t = await getTranslations("Mother.offline");
  return (
    <div className="app-bg min-h-screen px-4 py-8">
      <main className="mx-auto flex max-w-xl flex-col gap-4">
        <Wordmark />
        <section className="neu-card flex flex-col gap-3 p-5">
          <h1 className="font-heading text-2xl font-semibold">{t("title")}</h1>
          <p className="text-lg">{t("body")}</p>
          <OfflineRetry label={t("retry")} />
          <Link
            href="/mother"
            className="neu-raised inline-flex min-h-12 items-center justify-center rounded-xl px-5 text-base font-semibold"
          >
            {t("home")}
          </Link>
        </section>
      </main>
    </div>
  );
}
