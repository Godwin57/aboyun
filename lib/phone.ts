/**
 * Normalise a Nigerian mobile number to E.164 (+234XXXXXXXXXX).
 * Accepts "0803 123 4567", "803 123 4567", "2348031234567", "+234 803 123 4567".
 * Returns null when it is not a valid Nigerian mobile number.
 */
export function normalizeNgPhone(input: string): string | null {
  let digits = input.replace(/[^\d]/g, "");
  if (digits.startsWith("234") && digits.length === 13) {
    // already international
  } else if (digits.startsWith("0") && digits.length === 11) {
    digits = `234${digits.slice(1)}`;
  } else if (digits.length === 10) {
    digits = `234${digits}`;
  } else {
    return null;
  }
  return /^234[789][01]\d{8}$/.test(digits) ? `+${digits}` : null;
}

/**
 * Better Auth needs an email on every user. A mother registered with only a phone
 * number gets this placeholder address (it can never receive mail).
 */
const PLACEHOLDER_DOMAIN = "phone.aboyun.invalid";

export function placeholderEmailFor(phoneE164: string): string {
  return `${phoneE164.replace(/\D/g, "")}@${PLACEHOLDER_DOMAIN}`;
}

export function isPlaceholderEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${PLACEHOLDER_DOMAIN}`);
}

/** True when the text looks like an email address rather than a phone number. */
export function looksLikeEmail(input: string): boolean {
  return input.includes("@");
}

/** "+2348025550118" -> "+234 802 555 0118". Anything else is returned unchanged. */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const m = /^\+234(\d{3})(\d{3})(\d{4})$/.exec(phone);
  return m ? `+234 ${m[1]} ${m[2]} ${m[3]}` : phone;
}
