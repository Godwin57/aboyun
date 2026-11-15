"use client";

import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowLeft,
  Check,
  CircleAlert,
  Phone,
  Stethoscope,
  TriangleAlert,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { saveSymptomCheck } from "@/lib/offline/actions";
import { getDb } from "@/lib/offline/db";
import { SYMPTOM_SIGNS, type SymptomResult, type SymptomSign } from "@/lib/symptoms";
import { cn } from "@/lib/utils";
import { SavedBadge } from "./saved-badge";

type Contact = { name: string; clinicName: string; phone: string };
type Answers = Partial<Record<SymptomSign, boolean>>;

const TOTAL = SYMPTOM_SIGNS.length;

/** One question at a time, then the result. Every answer is kept on the phone. */
export function SymptomCheck({
  contact,
  onBack,
  onEmergency,
}: {
  contact: Contact | null;
  onBack: () => void;
  onEmergency: () => void;
}) {
  const t = useTranslations("Mother.check");
  const format = useFormatter();
  const [answers, setAnswers] = useState<Answers>({});
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [resultId, setResultId] = useState<string | null>(null);

  const recent = useLiveQuery(
    () => getDb().reports.orderBy("createdAt").reverse().limit(5).toArray(),
    [],
    [],
  );
  const saved = resultId ? recent.find((r) => r.id === resultId) : undefined;

  async function answer(sign: SymptomSign, value: boolean) {
    const next = { ...answers, [sign]: value };
    setAnswers(next);
    if (step < TOTAL - 1) {
      setStep(step + 1);
      return;
    }
    setSaving(true);
    try {
      const { id } = await saveSymptomCheck(next);
      setResultId(id);
    } finally {
      setSaving(false);
    }
  }

  function again() {
    setAnswers({});
    setStep(0);
    setResultId(null);
  }

  const sign = SYMPTOM_SIGNS[step];

  const recentList = (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{t("recent")}</h2>
      {recent.length === 0 ? (
        <p className="opacity-80">{t("none")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {recent.map((r) => (
            <li
              key={r.id}
              className="neu-inset flex flex-wrap items-center justify-between gap-2 px-3 py-2"
            >
              <span>
                <span className="block font-semibold">
                  {t(`result_label.${r.result}`)}
                </span>
                <span className="text-sm opacity-75">
                  {format.dateTime(new Date(r.createdAt), {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </span>
              <SavedBadge synced={r.synced} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  if (saved) {
    return (
      <Result
        result={saved.result}
        synced={saved.synced}
        yes={SYMPTOM_SIGNS.filter((s) => saved.signs[s])}
        contact={contact}
        onAgain={again}
        onHome={onBack}
        onEmergency={onEmergency}
        recent={recentList}
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-heading text-3xl font-semibold md:text-4xl">{t("title")}</h1>
        <span className="text-base font-semibold whitespace-nowrap md:text-lg">
          {t("step", { current: step + 1, total: TOTAL })}
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={TOTAL}
        aria-valuenow={step}
        aria-label={t("title")}
        className="h-3 overflow-hidden rounded-full bg-[#e9e4d8]"
      >
        <div
          className="h-full rounded-full bg-linear-to-r from-[#0f6a5f] to-[#1e8e6e] transition-[width]"
          style={{ width: `${(step / TOTAL) * 100}%` }}
        />
      </div>

      <section className="neu-card flex flex-col items-start gap-4 p-6 md:gap-5 md:p-10">
        <span
          className="flex size-14 items-center justify-center rounded-full bg-[#e3f1ee] text-[#0b4a42] md:size-16"
          aria-hidden
        >
          <Stethoscope className="size-7 md:size-8" />
        </span>
        <p
          aria-live="polite"
          className="font-heading text-3xl leading-snug font-semibold md:text-4xl"
        >
          {t(`signs.${sign}`)}
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3 md:gap-5">
        <button
          type="button"
          disabled={saving}
          aria-pressed={answers[sign] === true}
          onClick={() => void answer(sign, true)}
          className="btn-gradient min-h-22 cursor-pointer rounded-3xl text-2xl font-bold disabled:opacity-60 md:min-h-24 md:text-3xl"
        >
          {t("yes")}
        </button>
        <button
          type="button"
          disabled={saving}
          aria-pressed={answers[sign] === false}
          onClick={() => void answer(sign, false)}
          className="neu-raised min-h-22 cursor-pointer rounded-3xl text-2xl font-bold disabled:opacity-60 md:min-h-24 md:text-3xl"
        >
          {t("no")}
        </button>
      </div>

      {step > 0 && (
        <button
          type="button"
          onClick={() => setStep(step - 1)}
          className="inline-flex min-h-12 w-fit cursor-pointer items-center gap-1.5 text-base font-semibold"
        >
          <ArrowLeft className="size-5" aria-hidden />
          {t("previous")}
        </button>
      )}

      {step === 0 && recentList}
    </div>
  );
}

function CallLink({ contact, label }: { contact: Contact; label: string }) {
  return (
    <a
      href={`tel:${contact.phone.replace(/[^+\d]/g, "")}`}
      className="btn-gradient inline-flex min-h-16 items-center justify-center gap-3 rounded-[22px] px-5 text-lg font-bold md:text-xl"
    >
      <Phone className="size-6" aria-hidden />
      {label}
    </a>
  );
}

function Result({
  result,
  synced,
  yes,
  contact,
  onAgain,
  onHome,
  onEmergency,
  recent,
}: {
  result: SymptomResult;
  synced: 0 | 1 | 2;
  yes: SymptomSign[];
  contact: Contact | null;
  onAgain: () => void;
  onHome: () => void;
  onEmergency: () => void;
  recent: React.ReactNode;
}) {
  const t = useTranslations("Mother.check");
  const ghost =
    "inline-flex min-h-12 cursor-pointer items-center justify-center text-base font-semibold";

  if (result === "GO_NOW") {
    return (
      <div className="mx-auto grid w-full max-w-5xl gap-5 lg:grid-cols-2 lg:items-start lg:gap-7">
        <section
          role="alert"
          className="flex flex-col gap-4 rounded-[30px] bg-linear-to-br from-[#d83a22] to-[#a8230f] p-6 text-white shadow-[0_14px_30px_rgba(176,37,18,0.3)] md:p-9"
        >
          <span
            className="flex size-14 items-center justify-center rounded-full bg-white/20 md:size-16"
            aria-hidden
          >
            <TriangleAlert className="size-7 md:size-8" />
          </span>
          <h1 className="font-heading text-4xl leading-tight font-semibold md:text-5xl">
            {t("result.GO_NOW.title")}
          </h1>
          <p className="text-lg leading-snug md:text-xl">{t("result.GO_NOW.body")}</p>
          <SavedBadge synced={synced} className="w-fit" />
        </section>

        <div className="flex flex-col gap-4">
          {yes.length > 0 && (
            <section className="neu-card flex flex-col gap-3 p-5 md:p-6">
              <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
                {t("youSaidYes")}
              </h2>
              <ul className="flex flex-col gap-2.5">
                {yes.map((s) => (
                  <li key={s} className="flex items-start gap-3 text-lg font-semibold">
                    <span
                      className="mt-2.5 size-2.5 flex-none rounded-full bg-[#b02512]"
                      aria-hidden
                    />
                    {t(`signs.${s}`)}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {contact && <CallLink contact={contact} label={t("callClinic")} />}
          <button
            type="button"
            onClick={onEmergency}
            className="min-h-16 cursor-pointer rounded-[20px] bg-[#fbe3de] px-5 text-lg font-bold text-[#8f1d0e]"
          >
            {t("tellClinic")}
          </button>
          <button type="button" onClick={onHome} className={ghost}>
            {t("home")}
          </button>
        </div>
      </div>
    );
  }

  const ok = result === "OK";
  const Icon = ok ? Check : CircleAlert;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <section
        role="status"
        className={cn(
          "neu-card flex flex-col gap-4 p-6 md:p-9",
          !ok && "border-[#e0b44c]!",
        )}
      >
        <span
          className={cn(
            "flex size-14 items-center justify-center rounded-full md:size-16",
            ok ? "bg-[#d9f0e8] text-[#0a4f49]" : "bg-[#fceac8] text-[#7a5200]",
          )}
          aria-hidden
        >
          <Icon className="size-7 md:size-8" />
        </span>
        <h1 className="font-heading text-3xl leading-tight font-semibold md:text-4xl">
          {t(`result.${result}.title`)}
        </h1>
        <p className="text-lg leading-snug md:text-xl">{t(`result.${result}.body`)}</p>
        <SavedBadge synced={synced} className="w-fit" />
      </section>
      {!ok && contact && <CallLink contact={contact} label={t("callClinic")} />}
      <button
        type="button"
        onClick={onAgain}
        className="neu-raised min-h-14 cursor-pointer rounded-2xl px-5 text-lg font-semibold"
      >
        {t("again")}
      </button>
      <button type="button" onClick={onHome} className={ghost}>
        {t("home")}
      </button>
      {recent}
    </div>
  );
}
