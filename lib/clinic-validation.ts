import { z } from "zod";
import { normalizeNgPhone } from "@/lib/phone";
import { startOfUtcDay } from "@/lib/schedule";

// Validation for the clinic dashboard. Clinic screens are English only, so the
// messages here are plain text.

export const LANGUAGE_CODES = ["en", "pcm", "yo", "ig", "ha"] as const;
export type LanguageCode = (typeof LANGUAGE_CODES)[number];

/** Parse a "YYYY-MM-DD" string as that calendar day in UTC. */
export function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
    ? null
    : date;
}

const MAX_PREGNANCY_DAYS = 300; // anything older than this is a typo, not a pregnancy

const isoDate = z.string().refine((v) => parseIsoDate(v) !== null, "Enter a date");

const optionalPhone = z
  .string()
  .trim()
  .optional()
  .refine(
    (v) => !v || normalizeNgPhone(v) !== null,
    "Enter a valid Nigerian phone number",
  );

const familyContactSchema = z.object({
  name: z.string().trim().min(2, "Enter their name").max(120),
  phone: z
    .string()
    .trim()
    .refine((v) => normalizeNgPhone(v) !== null, "Enter a valid Nigerian phone number"),
  relation: z.string().trim().min(2, "Enter how they are related").max(60),
});

export const registerMotherSchema = z
  .object({
    name: z.string().trim().min(2, "Enter her full name").max(120),
    phone: optionalPhone,
    email: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || z.email().safeParse(v).success, "Enter a valid email address"),
    language: z.enum(LANGUAGE_CODES),
    lmp: isoDate
      .refine((v) => {
        const date = parseIsoDate(v);
        if (!date) return false;
        return date.getTime() <= startOfUtcDay(new Date()).getTime();
      }, "Her last period can't be in the future")
      .refine((v) => {
        const date = parseIsoDate(v);
        if (!date) return false;
        const days = (startOfUtcDay(new Date()).getTime() - date.getTime()) / 86_400_000;
        return days <= MAX_PREGNANCY_DAYS;
      }, "That is more than 10 months ago. Check the date."),
    familyContacts: z.array(familyContactSchema).max(5, "Add at most 5 contacts"),
    consent: z.literal(true, "She must agree before she can be registered"),
  })
  .superRefine((value, ctx) => {
    if (!value.phone && !value.email) {
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: "Enter a phone number or an email",
      });
    }
  });
export type RegisterMotherInput = z.input<typeof registerMotherSchema>;

export const recordVisitSchema = z.object({
  motherId: z.uuid(),
  /** Which of the eight antenatal contacts this is. */
  contactNo: z.number().int().min(1).max(8),
  attendedOn: isoDate.refine((v) => {
    const date = parseIsoDate(v);
    return !!date && date.getTime() <= startOfUtcDay(new Date()).getTime();
  }, "The visit can't be in the future"),
  bpSys: z
    .number({ error: "Enter the top blood pressure number" })
    .int()
    .min(60, "Check the top number")
    .max(260, "Check the top number"),
  bpDia: z
    .number({ error: "Enter the bottom blood pressure number" })
    .int()
    .min(30, "Check the bottom number")
    .max(180, "Check the bottom number"),
  weightKg: z
    .number()
    .min(25, "Check the weight")
    .max(250, "Check the weight")
    .optional(),
  hbGdl: z.number().min(2, "Check the Hb").max(20, "Check the Hb").optional(),
  signs: z.object({
    bleeding: z.boolean().optional(),
    headache: z.boolean().optional(),
    vision: z.boolean().optional(),
    fits: z.boolean().optional(),
    movement: z.boolean().optional(),
    fever: z.boolean().optional(),
    swelling: z.boolean().optional(),
    pain: z.boolean().optional(),
  }),
  notes: z.string().trim().max(500, "Keep notes under 500 characters").optional(),
});
export type RecordVisitInput = z.input<typeof recordVisitSchema>;

export const referMotherSchema = z.object({
  motherId: z.uuid(),
  reason: z.string().trim().max(300).optional(),
});

export const resolveFlagSchema = z.object({
  flagId: z.uuid(),
  note: z.string().trim().max(300).optional(),
});

/** Each language written in itself. */
export const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  en: "English",
  pcm: "Pidgin",
  yo: "Yorùbá",
  ig: "Igbo",
  ha: "Hausa",
};
