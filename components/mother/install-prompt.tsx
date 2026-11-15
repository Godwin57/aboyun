"use client";

import { Download, Share } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** Install button (Chrome / Android) or a short Add to Home Screen hint (iPhone). */
export function InstallPrompt() {
  const t = useTranslations("Mother.install");
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;

    const isIos =
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only detection
    setIos(isIos);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
    };
    const onInstalled = () => setEvent(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!event && !ios) return null;

  return (
    <section className="neu-card flex flex-col gap-3 p-4">
      <p className="text-base">{t("hint")}</p>
      {event ? (
        <button
          type="button"
          onClick={async () => {
            await event.prompt();
            await event.userChoice;
            setEvent(null);
          }}
          className="btn-gradient inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold"
        >
          <Download className="size-5" aria-hidden />
          {t("button")}
        </button>
      ) : (
        <p className="neu-inset flex items-start gap-2 p-3 text-base">
          <Share className="mt-0.5 size-5 flex-none" aria-hidden />
          {t("ios")}
        </p>
      )}
    </section>
  );
}
