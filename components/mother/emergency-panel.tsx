"use client";

import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowLeft,
  Check,
  CircleHelp,
  Clock,
  Droplet,
  HeartPulse,
  MessageSquareText,
  Phone,
  Smartphone,
  Zap,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { raiseEmergencyLocal } from "@/lib/offline/actions";
import { getDb, type LocalEmergency } from "@/lib/offline/db";
import { cn } from "@/lib/utils";
import { SavedBadge } from "./saved-badge";

const KINDS: { kind: LocalEmergency["kind"]; Icon: typeof Droplet }[] = [
  { kind: "BLEEDING", Icon: Droplet },
  { kind: "LABOUR", Icon: Clock },
  { kind: "FITS", Icon: Zap },
  { kind: "BABY", Icon: HeartPulse },
  { kind: "OTHER", Icon: CircleHelp },
];

type Contact = { name: string; clinicName: string; phone: string };

/** `tel:` and prefilled `sms:` links to her clinic. These work with no data connection. */
export function HelpLinks({ contact, kind }: { contact: Contact; kind?: string }) {
  const t = useTranslations("Mother.emergency");
  const body = t("smsBody", { name: contact.name, kind: kind ?? "" });
  const phone = contact.phone.replace(/[^+\d]/g, "");
  return (
    <div className="grid gap-3">
      <a
        href={`tel:${phone}`}
        className="btn-gradient inline-flex min-h-16 items-center justify-center gap-3 rounded-[22px] px-5 text-lg font-bold md:text-xl"
      >
        <Phone className="size-6" aria-hidden />
        {t("call", { facility: contact.clinicName })}
      </a>
      <a
        href={`sms:${phone}?body=${encodeURIComponent(body)}`}
        className="neu-raised inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl px-5 text-lg font-semibold"
      >
        <MessageSquareText className="size-5" aria-hidden />
        {t("sms", { facility: contact.clinicName })}
      </a>
    </div>
  );
}

export function EmergencyPanel({
  contact,
  onBack,
}: {
  contact: Contact | null;
  onBack: () => void;
}) {
  const t = useTranslations("Mother.emergency");
  const format = useFormatter();
  const [busy, setBusy] = useState(false);
  const [raisedId, setRaisedId] = useState<string | null>(null);

  const raised = useLiveQuery(
    async () => (raisedId ? ((await getDb().emergencies.get(raisedId)) ?? null) : null),
    [raisedId],
    null,
  );

  async function raise(kind: LocalEmergency["kind"]) {
    setBusy(true);
    try {
      setRaisedId(await raiseEmergencyLocal(kind));
    } finally {
      setBusy(false);
    }
  }

  const backButton = (
    <button
      type="button"
      onClick={onBack}
      className="neu-raised inline-flex min-h-12 w-fit cursor-pointer items-center gap-2 rounded-full py-2 pr-5 pl-3 text-base font-semibold"
    >
      <ArrowLeft className="size-5" aria-hidden />
      {raised ? t("done") : t("cancel")}
    </button>
  );

  if (raised) {
    const sent = raised.synced === 1;
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        {backButton}
        <section role="status" className="flex flex-col items-center gap-5 text-center">
          <span
            className={cn(
              "flex size-32 items-center justify-center rounded-full ring-[14px] md:size-36",
              sent
                ? "bg-[#d9f0e8] text-[#0a4f49] ring-[#ecf8f3]"
                : "bg-[#fceac8] text-[#7a5200] ring-[#fdf5e3]",
            )}
            aria-hidden
          >
            {sent ? (
              <Check className="size-16" strokeWidth={2.4} />
            ) : (
              <Smartphone className="size-16" strokeWidth={2} />
            )}
          </span>
          <h1 className="font-heading text-3xl leading-tight font-semibold md:text-4xl">
            {sent ? t("sentTitle") : t("savedTitle")}
          </h1>
          <p className="text-lg md:text-xl">{sent ? t("sentBody") : t("queuedBody")}</p>
          <div className="neu-card flex w-full max-w-md items-center gap-4 p-4 text-left">
            <span
              className={cn(
                "size-3.5 flex-none rounded-full",
                sent ? "bg-[#1e8e6e]" : "bg-[#d8901a]",
              )}
              aria-hidden
            />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-lg font-semibold">{t(`kind.${raised.kind}`)}</span>
              <span className="text-muted-foreground text-sm">
                {sent ? null : `${t("waiting")} · `}
                {format.dateTime(new Date(raised.createdAt), { timeStyle: "short" })}
              </span>
            </span>
            <SavedBadge synced={raised.synced} />
          </div>
        </section>
        {contact && (
          <>
            <p className="text-center text-lg font-semibold">{t("callNow")}</p>
            <HelpLinks contact={contact} kind={t(`kind.${raised.kind}`)} />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      {backButton}
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl leading-tight font-semibold md:text-4xl lg:text-5xl">
          {t("title")}
        </h1>
        <p className="text-lg md:text-xl">{t("intro")}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 md:gap-5">
        {KINDS.map(({ kind, Icon }, i) => (
          <button
            key={kind}
            type="button"
            disabled={busy}
            onClick={() => raise(kind)}
            className={cn(
              "neu-card flex min-h-20 cursor-pointer items-center gap-4 px-5 text-left disabled:opacity-60 md:min-h-24 md:px-7",
              i === KINDS.length - 1 && "md:col-span-2",
            )}
          >
            <span
              className="flex size-12 flex-none items-center justify-center rounded-full bg-[#fbe3de] text-[#b02512] md:size-14"
              aria-hidden
            >
              <Icon className="size-6 md:size-7" />
            </span>
            <span className="text-xl font-semibold md:text-2xl">{t(`kind.${kind}`)}</span>
          </button>
        ))}
      </div>
      <p className="rounded-[18px] bg-[#e3f1ee] px-5 py-4 text-base leading-snug text-[#0b3d38] md:text-lg">
        {t("offlineNote")}
      </p>
      {contact && <HelpLinks contact={contact} />}
    </div>
  );
}
