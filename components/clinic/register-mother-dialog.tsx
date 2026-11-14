"use client";

import { Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { registerMotherAction } from "@/app/(roles)/clinic/mothers/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LANGUAGE_CODES,
  LANGUAGE_NAMES,
  parseIsoDate,
  registerMotherSchema,
} from "@/lib/clinic-validation";
import { eddFromLmp, gestationalAge, startOfUtcDay } from "@/lib/schedule";
import { formatDayYear } from "@/lib/format";
import { cn } from "@/lib/utils";

type FormValues = {
  name: string;
  phone: string;
  email: string;
  language: (typeof LANGUAGE_CODES)[number];
  lmp: string;
  familyContacts: { name: string; phone: string; relation: string }[];
  consent: boolean;
};

const input =
  "neu-inset h-12 w-full px-3.5 text-base text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/40";
const label = "flex flex-col gap-1.5 font-medium";
const hint = "text-muted-foreground text-sm";

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span role="alert" className="text-destructive text-sm font-normal">
      {message}
    </span>
  );
}

/** "Register a mother": a button, and the form it opens in a modal. */
export function RegisterMotherDialog({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      language: "en",
      lmp: "",
      familyContacts: [{ name: "", phone: "", relation: "" }],
      consent: false,
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "familyContacts" });

  // Live due date and weeks as the nurse types the last-period date.
  const lmpDate = parseIsoDate(useWatch({ control, name: "lmp" }) ?? "");
  const today = startOfUtcDay(new Date());
  const lmpOk = !!lmpDate && lmpDate.getTime() <= today.getTime();
  const age = lmpOk ? gestationalAge(lmpDate, today) : null;

  async function onSubmit(values: FormValues) {
    const payload = {
      ...values,
      phone: values.phone.trim() || undefined,
      email: values.email.trim() || undefined,
      // Ignore contact rows she left empty.
      familyContacts: values.familyContacts.filter(
        (c) => c.name || c.phone || c.relation,
      ),
    };

    const parsed = registerMotherSchema.safeParse(payload);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const path = issue.path.filter(
          (p): p is string | number => typeof p !== "symbol",
        );
        setError(path.join(".") as keyof FormValues, { message: issue.message });
      }
      return;
    }

    const result = await registerMotherAction(payload);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast[result.inviteSent ? "success" : "warning"](
      result.inviteSent
        ? `${result.name} is registered. A password link was sent by ${result.via === "email" ? "email" : "SMS"}.`
        : `${result.name} is registered, but the password link could not be sent.`,
    );
    setOpen(false);
    reset();
    router.push(`/clinic/mothers/${result.motherId}`);
    router.refresh();
  }

  const e = errors;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="btn-gradient inline-flex min-h-12 cursor-pointer items-center gap-2.5 rounded-xl px-5 text-base font-semibold"
      >
        <Plus className="size-5" strokeWidth={2.2} aria-hidden />
        Register a mother
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="neu-card top-10 flex max-h-[calc(100dvh-5rem)] w-full max-w-[calc(100%-1.5rem)] translate-y-0 flex-col gap-0 overflow-hidden rounded-[28px] p-0 sm:max-w-[780px]"
        >
          <div className="flex items-start justify-between gap-4 px-7 pt-6 pb-3.5">
            <div>
              <DialogTitle className="font-heading text-[28px] leading-tight font-semibold">
                Register a mother
              </DialogTitle>
              <DialogDescription className="mt-1 text-base leading-snug">
                She gets a link to set her own password. Her visits and reminders are
                created for you.
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="neu-raised inline-flex size-11 flex-none cursor-pointer items-center justify-center rounded-[14px]"
            >
              <X className="size-5" strokeWidth={2.2} aria-hidden />
            </button>
          </div>

          <form
            id="register-mother"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-7 pt-1.5 pb-6"
          >
            <fieldset className="flex min-w-0 flex-col gap-4">
              <legend className="font-heading mb-3.5 text-[19px] font-semibold">
                About her
              </legend>
              <label className={label}>
                Full name
                <input className={input} autoComplete="off" {...register("name")} />
                <ErrorText message={e.name?.message} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={label}>
                  Phone number
                  <input
                    type="tel"
                    className={input}
                    placeholder="0803 123 4567"
                    {...register("phone")}
                  />
                  <ErrorText message={e.phone?.message} />
                </label>
                <label className={label}>
                  Email (optional)
                  <input
                    type="email"
                    className={input}
                    placeholder="name@example.com"
                    {...register("email")}
                  />
                  <ErrorText message={e.email?.message} />
                </label>
              </div>
              <div className={cn(hint, "-mt-1.5")}>
                At least one is needed. With only a phone number, the password link goes
                by SMS.
              </div>
              <label className={cn(label, "max-w-xs")}>
                Her language
                <select className={input} {...register("language")}>
                  {LANGUAGE_CODES.map((code) => (
                    <option key={code} value={code}>
                      {LANGUAGE_NAMES[code]}
                    </option>
                  ))}
                </select>
              </label>
            </fieldset>

            <fieldset className="flex min-w-0 flex-col gap-4">
              <legend className="font-heading mb-3.5 text-[19px] font-semibold">
                Her pregnancy
              </legend>
              <div className="flex flex-wrap items-end gap-4">
                <label className={cn(label, "max-w-[300px] min-w-[220px] flex-1")}>
                  First day of her last period
                  <input
                    type="date"
                    className={input}
                    max={today.toISOString().slice(0, 10)}
                    {...register("lmp")}
                  />
                  <ErrorText message={e.lmp?.message} />
                </label>
                <div
                  className="flex min-w-[260px] flex-[1_1_300px] flex-wrap gap-6 rounded-2xl px-[18px] py-3"
                  style={{
                    background: "linear-gradient(135deg, #e3f1ee 0%, #d2ebe5 100%)",
                    boxShadow:
                      "inset 2px 2px 6px rgba(15,107,99,0.10), inset -2px -2px 6px rgba(255,255,255,0.7)",
                  }}
                  aria-live="polite"
                >
                  <div>
                    <div className="text-xs font-semibold tracking-wide text-[#0a4f49] uppercase">
                      Due date
                    </div>
                    <div className="font-heading text-[21px] font-semibold">
                      {lmpOk
                        ? formatDayYear(eddFromLmp(lmpDate))
                        : "Enter her last period"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold tracking-wide text-[#0a4f49] uppercase">
                      Now
                    </div>
                    <div className="font-heading text-[21px] font-semibold">
                      {age ? `${age.weeks} weeks, ${age.days} days` : "-"}
                    </div>
                  </div>
                </div>
              </div>
            </fieldset>

            <fieldset className="flex min-w-0 flex-col gap-3.5">
              <legend className="font-heading mb-1 text-[19px] font-semibold">
                Family contacts
              </legend>
              <div className={cn(hint, "mb-2")}>
                They are told if there is an emergency. They do not get a login.
              </div>
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid items-start gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
                >
                  <label className={label}>
                    Name
                    <input
                      className={input}
                      {...register(`familyContacts.${index}.name`)}
                    />
                    <ErrorText message={e.familyContacts?.[index]?.name?.message} />
                  </label>
                  <label className={label}>
                    Phone
                    <input
                      type="tel"
                      className={input}
                      {...register(`familyContacts.${index}.phone`)}
                    />
                    <ErrorText message={e.familyContacts?.[index]?.phone?.message} />
                  </label>
                  <label className={label}>
                    Relation
                    <input
                      className={input}
                      placeholder="Husband"
                      {...register(`familyContacts.${index}.relation`)}
                    />
                    <ErrorText message={e.familyContacts?.[index]?.relation?.message} />
                  </label>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    aria-label={`Remove contact ${index + 1}`}
                    className="neu-raised text-muted-foreground mt-7 inline-flex size-12 cursor-pointer items-center justify-center rounded-xl"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
              ))}
              <div>
                <button
                  type="button"
                  onClick={() => append({ name: "", phone: "", relation: "" })}
                  disabled={fields.length >= 5}
                  className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[#0f6b63] bg-transparent px-4 font-semibold text-[#0f6b63] disabled:opacity-50"
                >
                  <Plus className="size-[18px]" strokeWidth={2.2} aria-hidden />
                  Add another contact
                </button>
              </div>
            </fieldset>

            <div>
              <label className="neu-inset flex cursor-pointer items-start gap-3.5 rounded-2xl px-[18px] py-4">
                <input
                  type="checkbox"
                  className="mt-0.5 size-6 flex-none accent-[#0f6b63]"
                  {...register("consent")}
                />
                <span>
                  <span className="block font-semibold">
                    She agrees to have her health information recorded
                  </span>
                  <span className="text-muted-foreground mt-0.5 block text-sm">
                    Explain what is kept and who can see it: her clinic and the Aboyun
                    team. Only collect what her care needs.
                  </span>
                </span>
              </label>
              <div className="mt-2">
                <ErrorText message={e.consent?.message} />
              </div>
            </div>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-3.5 border-t border-[#e6dfd2] bg-[linear-gradient(180deg,rgba(246,243,236,0.9),#f1ede4)] px-7 py-4">
            <div className="text-muted-foreground min-w-[240px] flex-1 text-sm leading-snug">
              8 antenatal visits are scheduled from her due date. Tablet reminders start
              today.
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="neu-raised min-h-[52px] cursor-pointer rounded-xl px-[22px] font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="register-mother"
                disabled={isSubmitting}
                className="btn-gradient min-h-[52px] cursor-pointer rounded-xl px-[26px] text-base font-semibold disabled:opacity-70"
              >
                {isSubmitting ? "Registering…" : "Register and send password link"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
