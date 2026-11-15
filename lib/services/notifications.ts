import { sendSms } from "@/lib/at";
import { sendEmail } from "@/lib/email";
import { formatPhone } from "@/lib/phone";

/** Send an SMS and never throw: one failed message must not stop the others. */
export async function trySms(to: string | null | undefined, message: string) {
  if (!to) return false;
  try {
    await sendSms(to, message);
    return true;
  } catch (error) {
    console.error(`SMS to ${to} failed`, error);
    return false;
  }
}

/** Send an email and never throw. */
export async function tryEmail(opts: { to: string; subject: string; text: string }) {
  try {
    await sendEmail({
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: `<p>${opts.text.replace(/\n/g, "<br>")}</p>`,
    });
    return true;
  } catch (error) {
    console.error(`Email to ${opts.to} failed`, error);
    return false;
  }
}

/** "+234 802 555 0118" for messages. */
export const displayPhone = formatPhone;
