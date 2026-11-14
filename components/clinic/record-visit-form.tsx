"use client";

import { Check, CircleAlert, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { recordVisitAction } from "@/app/(roles)/clinic/mothers/[id]/actions";
import { recordVisitSchema } from "@/lib/clinic-validation";
import {
  assessVisit,
  DANGER_SIGNS,
  DANGER_SIGN_LABELS,
  type DangerSign,
} from "@/lib/risk";
import { cn } from "@/lib/utils";

type FormValues = {
  contactNo: string;
  attendedOn: string;
  bpSys: string;
  bpDia: string;
  weightKg: string;
  hbGdl: string;
  signs: Record<DangerSign, boolean>;
  notes: string;
};

const input =
  "neu-inset h-[52px] w-full px-3.5 text-xl font-semibold text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/40";
const plainInput =
  "neu-inset h-12 w-full px-3.5 text-base text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/40";
const label = "flex flex-col gap-1.5 font-medium";

const toNumber = (value: string) => {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
};

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span role="alert" className="text-destructive text-sm font-normal">
      {message}
    </span>
  );
}

export function RecordVisitForm({
  motherId,
  motherName,
  weeks,
  contacts,
  defaultContact,
  todayIso,
}: {
  motherId: string;
  motherName: string;
  weeks: number;
  contacts: { no: number; label: string }[];
  defaultContact: number;
  todayIso: string;
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      contactNo: String(defaultContact),
      attendedOn: todayIso,
      bpSys: "",
      bpDia: "",
      weightKg: "",
      hbGdl: "",
      signs: Object.fromEntries(DANGER_SIGNS.map((s) => [s, false])) as Record<
        DangerSign,
        boolean
      >,
      notes: "",
    },
  });

  // The same rules the server uses, run as she is typed.
  const values = useWatch({ control }) as FormValues;
  const assessment = assessVisit({
    bpSys: toNumber(values.bpSys ?? ""),
    bpDia: toNumber(values.bpDia ?? ""),
    hbGdl: toNumber(values.hbGdl ?? ""),
    signs: values.signs,
  });
  const hasReadings = values.bpSys !== "" || values.bpDia !== "" || values.hbGdl !== "";
  const tone = assessment.refer
    ? "refer"
    : assessment.level === "HIGH"
      ? "high"
      : assessment.level === "MEDIUM"
        ? "medium"
        : "low";

  async function onSubmit(v: FormValues) {
    const payload = {
      motherId,
      contactNo: Number(v.contactNo),
      attendedOn: v.attendedOn,
      bpSys: toNumber(v.bpSys),
      bpDia: toNumber(v.bpDia),
      weightKg: toNumber(v.weightKg),
      hbGdl: toNumber(v.hbGdl),
      signs: v.signs,
      notes: v.notes.trim() || undefined,
    };

    const parsed = recordVisitSchema.safeParse(payload);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && field in v) {
          setError(field as keyof FormValues, { message: issue.message });
        }
      }
      return;
    }

    const result = await recordVisitAction(payload);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast[result.refer ? "warning" : "success"](
      result.refer ? "Visit saved. She needs a referral." : "Visit saved.",
    );
    router.push(`/clinic/mothers/${motherId}`);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-start gap-6">
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex min-w-0 flex-[3_1_520px] flex-col gap-5"
      >
        <fieldset className="neu-card flex min-w-0 flex-wrap gap-[18px] p-6">
          <legend className="font-heading px-2 text-xl font-semibold">Which visit</legend>
          <label className={cn(label, "min-w-[260px] flex-[1_1_260px]")}>
            Contact
            <select className={plainInput} {...register("contactNo")}>
              {contacts.map((c) => (
                <option key={c.no} value={c.no}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className={cn(label, "min-w-[200px] flex-[1_1_200px]")}>
            Date she came
            <input
              type="date"
              max={todayIso}
              className={plainInput}
              {...register("attendedOn")}
            />
            <ErrorText message={errors.attendedOn?.message} />
          </label>
        </fieldset>

        <fieldset className="neu-card flex min-w-0 flex-col gap-[18px] p-6">
          <legend className="font-heading px-2 text-xl font-semibold">Readings</legend>
          <div className="grid [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))] gap-[18px]">
            <label className={label}>
              Blood pressure, top number
              <input
                type="number"
                inputMode="numeric"
                className={input}
                {...register("bpSys")}
              />
              <ErrorText message={errors.bpSys?.message} />
            </label>
            <label className={label}>
              Bottom number
              <input
                type="number"
                inputMode="numeric"
                className={input}
                {...register("bpDia")}
              />
              <ErrorText message={errors.bpDia?.message} />
            </label>
            <label className={label}>
              Weight (kg)
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                className={input}
                {...register("weightKg")}
              />
              <ErrorText message={errors.weightKg?.message} />
            </label>
            <label className={label}>
              Hb (g/dL)
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                className={input}
                {...register("hbGdl")}
              />
              <ErrorText message={errors.hbGdl?.message} />
            </label>
          </div>
        </fieldset>

        <fieldset className="neu-card flex min-w-0 flex-col gap-3.5 p-6">
          <legend className="font-heading px-2 text-xl font-semibold">
            Danger signs
          </legend>
          <div className="text-muted-foreground -mt-1 text-sm">
            Tick anything she has now or since her last visit.
          </div>
          <div className="grid [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))] gap-2.5">
            {DANGER_SIGNS.map((sign) => (
              <label
                key={sign}
                className="neu-raised flex min-h-[52px] cursor-pointer items-center gap-3 rounded-[14px] px-3.5"
              >
                <input
                  type="checkbox"
                  className="size-[22px] flex-none accent-[#b3261e]"
                  {...register(`signs.${sign}`)}
                />
                <span className="font-medium">{DANGER_SIGN_LABELS[sign]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="neu-card flex min-w-0 flex-col gap-3 p-6">
          <legend className="font-heading px-2 text-xl font-semibold">Notes</legend>
          <label className={label}>
            Anything else to remember (optional)
            <textarea
              rows={3}
              className="neu-inset focus-visible:ring-ring/40 w-full resize-y px-3.5 py-3 text-base font-normal outline-none focus-visible:ring-3"
              {...register("notes")}
            />
            <ErrorText message={errors.notes?.message} />
          </label>
        </fieldset>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-gradient min-h-[52px] cursor-pointer rounded-xl px-7 text-base font-semibold disabled:opacity-70"
          >
            {isSubmitting ? "Saving…" : "Save visit"}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/clinic/mothers/${motherId}`)}
            className="neu-raised min-h-[52px] cursor-pointer rounded-xl px-[22px] font-medium"
          >
            Cancel
          </button>
        </div>
      </form>

      <aside
        aria-labelledby="risk"
        className="flex min-w-0 flex-[2_1_340px] flex-col gap-5"
      >
        <section aria-live="polite" className="neu-card overflow-hidden">
          <div className="px-6 pt-[18px]">
            <h2 id="risk" className="font-heading text-[22px] font-semibold">
              Risk check
            </h2>
            <div className="text-muted-foreground text-sm">
              {motherName}, {weeks} weeks
            </div>
          </div>

          <div
            className={cn(
              "mx-6 mt-4 flex items-start gap-3.5 rounded-[14px] border-2 px-[18px] py-4",
              tone === "refer" || tone === "high"
                ? "border-[#b3261e] bg-[#fbe7e4]"
                : tone === "medium"
                  ? "border-[#c98a00] bg-[#fdf1d0]"
                  : "border-[#0f6b63] bg-[#e3f1ee]",
            )}
          >
            <span
              className={cn(
                "inline-flex size-10 flex-none items-center justify-center rounded-full",
                tone === "refer" || tone === "high"
                  ? "bg-[#b3261e] text-white"
                  : tone === "medium"
                    ? "bg-[#f4c24f] text-[#4a3410]"
                    : "bg-[#0f6b63] text-white",
              )}
            >
              {tone === "refer" || tone === "high" ? (
                <TriangleAlert className="size-[22px]" aria-hidden />
              ) : tone === "medium" ? (
                <CircleAlert className="size-[22px]" aria-hidden />
              ) : (
                <Check className="size-[22px]" strokeWidth={2.6} aria-hidden />
              )}
            </span>
            <div>
              <div
                className={cn(
                  "text-xl font-semibold",
                  tone === "refer" || tone === "high"
                    ? "text-[#8c1d18]"
                    : tone === "medium"
                      ? "text-[#6b4a00]"
                      : "text-[#0a4f49]",
                )}
              >
                {tone === "refer"
                  ? "Refer now"
                  : tone === "high"
                    ? "High risk"
                    : tone === "medium"
                      ? "Medium risk"
                      : "Low risk"}
              </div>
              <div className="mt-0.5 leading-snug">
                {tone === "refer"
                  ? "Send her to a facility with a doctor today. After saving you can record the referral."
                  : tone === "high"
                    ? "Raised blood pressure. A doctor should review her."
                    : tone === "medium"
                      ? "Keep an eye on this at her next visit."
                      : hasReadings
                        ? "No concerns from these readings."
                        : "Enter the readings to see the result."}
              </div>
            </div>
          </div>

          <div className="px-6 pt-[18px] pb-[22px]">
            {assessment.reasons.length === 0 ? (
              <div className="text-muted-foreground">Nothing to flag yet.</div>
            ) : (
              <>
                <div className="text-muted-foreground mb-2 text-[13px] font-semibold tracking-wide uppercase">
                  Why
                </div>
                <ul className="flex flex-col gap-2.5">
                  {assessment.reasons.map((r) => (
                    <li key={r.code} className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "inline-flex h-[26px] flex-none items-center rounded-full px-2.5 text-[13px] font-semibold",
                          r.level === "HIGH"
                            ? "bg-[#fbe7e4] text-[#8c1d18]"
                            : "bg-[#fdf1d0] text-[#6b4a00]",
                        )}
                      >
                        {r.level === "HIGH" ? "High" : "Medium"}
                      </span>
                      <span className="font-medium">{r.text}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>

        <section aria-labelledby="rules" className="neu-card px-6 py-5">
          <h2 id="rules" className="font-heading mb-2.5 text-lg font-semibold">
            How we decide
          </h2>
          <ul className="list-disc pl-[18px] text-sm leading-relaxed">
            <li>
              Blood pressure 160 or more on top, or 110 or more on the bottom: high, refer
              now
            </li>
            <li>140/90 or more: high</li>
            <li>Hb under 7: high, refer now</li>
            <li>Hb 7 to 10.9: medium</li>
            <li>Any danger sign: high, refer now</li>
          </ul>
        </section>
      </aside>
    </div>
  );
}
