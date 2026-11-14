"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Check, CircleAlert, TriangleAlert } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { saveSymptomCheck } from "@/lib/offline/actions";
import { getDb } from "@/lib/offline/db";
import { SYMPTOM_SIGNS, type SymptomResult, type SymptomSign } from "@/lib/symptoms";
import { cn } from "@/lib/utils";
import { SavedBadge } from "./saved-badge";

const RESULT_STYLE: Record<SymptomResult, { box: string; Icon: typeof Check }> = {
  OK: { box: "neu-card", Icon: Check },
  CLINIC_SOON: { box: "neu-card border-[#e0b44c]!", Icon: CircleAlert },
  // Red is kept for "go now": it is the one result that is an emergency.
  GO_NOW: { box: "alert-danger", Icon: TriangleAlert },
};

export function SymptomCheck({ onBack }: { onBack: () => void }) {
  const t = useTranslations("Mother.check");
  const format = useFormatter();
  const [answers, setAnswers] = useState<Partial<Record<SymptomSign, boolean>>>({});
  const [missing, setMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resultId, setResultId] = useState<string | null>(null);

  const recent = useLiveQuery(
    () => getDb().reports.orderBy("createdAt").reverse().limit(5).toArray(),
    [],
    [],
  );
  const saved = resultId ? recent.find((r) => r.id === resultId) : undefined;

  async function submit() {
    if (SYMPTOM_SIGNS.some((s) => answers[s] === undefined)) {
      setMissing(true);
      return;
    }
    setSaving(true);
    try {
      const { id } = await saveSymptomCheck(answers);
      setResultId(id);
    } finally {
      setSaving(false);
    }
  }

  function again() {
    setAnswers({});
    setMissing(false);
    setResultId(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-12 w-fit cursor-pointer items-center gap-2 text-base font-semibold"
      >
        <ArrowLeft className="size-5" aria-hidden />
        {t("back")}
      </button>
      <h1 className="font-heading text-3xl font-semibold">{t("title")}</h1>

      {saved ? (
        <section
          role="status"
          className={cn("flex flex-col gap-3 p-5", RESULT_STYLE[saved.result].box)}
        >
          {(() => {
            const { Icon } = RESULT_STYLE[saved.result];
            return (
              <h2 className="flex items-center gap-2 text-xl font-semibold">
                <Icon className="size-6 flex-none" aria-hidden />
                {t(`result.${saved.result}.title`)}
              </h2>
            );
          })()}
          <p className="text-lg">{t(`result.${saved.result}.body`)}</p>
          <SavedBadge synced={saved.synced} className="w-fit" />
          <button
            type="button"
            onClick={again}
            className="neu-raised mt-1 inline-flex min-h-12 cursor-pointer items-center justify-center rounded-xl px-5 text-base font-semibold"
          >
            {t("again")}
          </button>
        </section>
      ) : (
        <>
          <p className="text-lg">{t("intro")}</p>
          <ul className="flex flex-col gap-3">
            {SYMPTOM_SIGNS.map((sign) => (
              <li key={sign}>
                <fieldset className="neu-card flex flex-col gap-3 p-4">
                  <legend className="sr-only">{t(`signs.${sign}`)}</legend>
                  <p className="text-lg font-medium" aria-hidden>
                    {t(`signs.${sign}`)}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {([true, false] as const).map((value) => {
                      const on = answers[sign] === value;
                      return (
                        <button
                          key={String(value)}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setAnswers((a) => ({ ...a, [sign]: value }))}
                          className={cn(
                            "min-h-14 cursor-pointer rounded-xl px-4 text-lg font-semibold",
                            on ? "btn-gradient" : "neu-raised",
                          )}
                        >
                          {value ? t("yes") : t("no")}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              </li>
            ))}
          </ul>
          {missing && (
            <p role="alert" className="text-base font-semibold text-[#8c1d18]">
              {t("answerAll")}
            </p>
          )}
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="btn-gradient min-h-14 cursor-pointer rounded-xl px-5 text-lg font-semibold disabled:opacity-60"
          >
            {t("submit")}
          </button>
        </>
      )}

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
    </div>
  );
}
