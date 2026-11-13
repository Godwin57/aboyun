import { z } from "zod";
import { looksLikeEmail, normalizeNgPhone } from "@/lib/phone";

export const PASSWORD_MIN = 8;

// Messages on the auth schemas are keys in the "Errors" namespace of messages/*.json.
// Screens translate them, so validation errors appear in the user's language.
export type AuthErrorKey =
  | "identifierRequired"
  | "identifierInvalid"
  | "passwordRequired"
  | "passwordMin"
  | "passwordMax"
  | "passwordMismatch";

/** One field that takes a Nigerian phone number or an email address. */
export const identifierSchema = z
  .string()
  .trim()
  .min(1, "identifierRequired" satisfies AuthErrorKey)
  .refine(
    (v) =>
      looksLikeEmail(v) ? z.email().safeParse(v).success : normalizeNgPhone(v) !== null,
    "identifierInvalid" satisfies AuthErrorKey,
  );

/** Sign-in for every role: phone or email, plus password. */
export const loginSchema = z.object({
  identifier: identifierSchema,
  password: z.string().min(1, "passwordRequired" satisfies AuthErrorKey),
});

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, "passwordMin" satisfies AuthErrorKey)
  .max(128, "passwordMax" satisfies AuthErrorKey);

export const acceptInviteSchema = z
  .object({
    token: z.string().min(1),
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "passwordMismatch" satisfies AuthErrorKey,
  });

// Admin-only form (English for now): messages are plain text.
export const createClinicSchema = z.object({
  name: z.string().trim().min(2, "Enter the clinic name").max(120),
  state: z.string().trim().min(2, "Enter the state").max(60),
  lga: z.string().trim().min(2, "Enter the LGA").max(80),
  phone: z
    .string()
    .trim()
    .refine((v) => normalizeNgPhone(v) !== null, "Enter a valid Nigerian phone number"),
  email: z.email("Enter a valid email address"),
  contactName: z.string().trim().min(2, "Enter the contact person's name").max(120),
  hasCSection: z.boolean(),
  hasBlood: z.boolean(),
});
export type CreateClinicInput = z.infer<typeof createClinicSchema>;
