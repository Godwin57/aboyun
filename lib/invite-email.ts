import { createTranslator } from "next-intl";
import { sendSms } from "@/lib/at";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { defaultLocale, isLocale } from "@/i18n/config";
import { isPlaceholderEmail } from "@/lib/phone";

/**
 * Send the "set your password" link, in the person's own language
 * (a mother's saved language, otherwise English).
 *
 * - Normal case: an email.
 * - Mothers registered with a phone number only (placeholder email): an SMS instead.
 */
export async function sendInviteMessage(
  user: { id: string; email: string },
  url: string,
) {
  const mother = await db.mother.findUnique({
    where: { userId: user.id },
    select: { language: true },
  });
  const locale = isLocale(mother?.language) ? mother.language : defaultLocale;
  const messages = (await import(`../messages/${locale}.json`)).default;
  const t = createTranslator({ locale, messages, namespace: "Email" });

  if (isPlaceholderEmail(user.email)) {
    const row = await db.user.findUnique({
      where: { id: user.id },
      select: { phoneNumber: true },
    });
    if (row?.phoneNumber) await sendSms(row.phoneNumber, t("sms", { url }));
    return;
  }

  // TODO: a separate "forgot password" wording once that flow is built (deferred).
  const hasPassword = !!(await db.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
    select: { id: true },
  }));
  const intro = hasPassword ? t("resetIntro") : t("inviteIntro");

  await sendEmail({
    to: user.email,
    subject: hasPassword ? t("resetSubject") : t("inviteSubject"),
    text: `${intro}\n\n${url}\n\n${t("footer")}`,
    html: `<p>${intro}</p><p><a href="${url}">${t("button")}</a></p><p>${t("footer")}</p>`,
  });
}
