"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, MessageSquareText, Phone, TriangleAlert } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { raiseEmergencyLocal } from "@/lib/offline/actions";
import { getDb, type LocalEmergency } from "@/lib/offline/db";
import { cn } from "@/lib/utils";
import { SavedBadge } from "./saved-badge";

const KINDS: LocalEmergency["kind"][] = ["BLEEDING", "LABOUR", "FITS", "BABY", "OTHER"];

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
        className="btn-gradient inline-flex min-h-14 items-center justify-center gap-2 rounded-xl px-5 text-lg font-semibold"
      >
        <Phone className="size-5" aria-hidden />
        {t("call", { facility: contact.clinicName })}
      </a>
      <a
        href={`sms:${phone}?body=${encodeURIComponent(body)}`}
        className="neu-raised inline-flex min-h-14 items-center justify-center gap-2 rounded-xl px-5 text-lg font-semibold"
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

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-12 w-fit cursor-pointer items-center gap-2 text-base font-semibold"
      >
        <ArrowLeft className="size-5" aria-hidden />
        {raised ? t("done") : t("cancel")}
      </button>

      {raised ? (
        <>
          <section
            role="status"
            className={cn(
              "flex flex-col gap-3 p-5",
              raised.synced === 1 ? "neu-card" : "alert-danger",
            )}
          >
            <h1 className="flex items-center gap-2 text-2xl font-semibold">
              <TriangleAlert className="size-6 flex-none" aria-hidden />
              {raised.synced === 1 ? t("sentTitle") : t("queuedTitle")}
            </h1>
            <p className="text-lg">
              {raised.synced === 1 ? t("sentBody") : t("queuedBody")}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <SavedBadge synced={raised.synced} />
              <span className="text-sm opacity-75">
                {t(`kind.${raised.kind}`)} ·{" "}
                {format.dateTime(new Date(raised.createdAt), { timeStyle: "short" })}
              </span>
            </div>
          </section>
          {contact && <HelpLinks contact={contact} kind={t(`kind.${raised.kind}`)} />}
        </>
      ) : (
        <>
          <h1 className="font-heading text-3xl font-semibold">{t("title")}</h1>
          <p className="text-lg">{t("intro")}</p>
          <div className="grid gap-3">
            {KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                disabled={busy}
                onClick={() => raise(kind)}
                className="btn-danger min-h-16 cursor-pointer rounded-2xl px-5 text-xl font-semibold disabled:opacity-60"
              >
                {t(`kind.${kind}`)}
              </button>
            ))}
          </div>
          {contact && <HelpLinks contact={contact} />}
        </>
      )}
    </div>
  );
}
