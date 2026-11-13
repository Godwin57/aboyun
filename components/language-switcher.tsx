"use client";

import { Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocale } from "@/i18n/actions";
import { localeNames, locales } from "@/i18n/config";

/** Language picker. Switching is instant: the page re-renders in the new language. */
export function LanguageSwitcher() {
  const t = useTranslations("Common");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{t("language")}</span>
      <Globe
        aria-hidden
        className="text-muted-foreground pointer-events-none absolute left-3 size-4"
      />
      <select
        value={locale}
        disabled={pending}
        onChange={(e) =>
          startTransition(async () => {
            await setLocale(e.target.value);
            router.refresh();
          })
        }
        className="border-input bg-card focus-visible:ring-ring/50 h-11 min-w-36 rounded-lg border pr-3 pl-9 text-base outline-none focus-visible:ring-3"
      >
        {locales.map((code) => (
          <option key={code} value={code}>
            {localeNames[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
