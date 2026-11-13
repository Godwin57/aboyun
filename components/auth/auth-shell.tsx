import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";

/** Wordmark: a teal disc with a marigold dot (mother and child), then the name. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="bg-primary text-primary-foreground relative flex size-9 items-center justify-center rounded-full">
        <span className="bg-primary-foreground size-3.5 rounded-full" />
        <span className="bg-accent absolute right-1 bottom-1 size-2.5 rounded-full" />
      </span>
      <span className="font-heading text-2xl font-semibold tracking-tight">Aboyun</span>
    </Link>
  );
}

/**
 * Two-panel layout for all sign-in screens: a warm brand panel on large screens,
 * and a single focused column on phones. The language toggle is always visible so
 * signed-out visitors can pick their language first.
 */
export async function AuthShell({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("Auth.shell");

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="bg-primary text-primary-foreground relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="bg-accent/25 pointer-events-none absolute -top-24 -right-24 size-96 rounded-full blur-3xl"
        />
        <div
          aria-hidden
          className="bg-secondary/20 pointer-events-none absolute -bottom-32 -left-16 size-96 rounded-full blur-3xl"
        />
        <Link href="/" className="relative inline-flex items-center gap-2.5">
          <span className="bg-primary-foreground text-primary relative flex size-9 items-center justify-center rounded-full">
            <span className="bg-primary size-3.5 rounded-full" />
            <span className="bg-accent absolute right-1 bottom-1 size-2.5 rounded-full" />
          </span>
          <span className="font-heading text-2xl font-semibold tracking-tight">
            Aboyun
          </span>
        </Link>
        <h2 className="font-heading relative max-w-md text-4xl leading-tight font-semibold">
          {t("tagline")}
        </h2>
        <p className="text-primary-foreground/70 relative text-sm">{t("privacy")}</p>
      </aside>

      <main className="flex flex-col px-5 py-6 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <div className="lg:hidden">
            <Wordmark />
          </div>
          <div className="ml-auto">
            <LanguageSwitcher />
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
