"use server";

import { cookies } from "next/headers";
import { getAppSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { isLocale, LOCALE_COOKIE } from "./config";

const ONE_YEAR = 60 * 60 * 24 * 365;

async function writeCookie(locale: string) {
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
  });
}

/** Language toggle: remember the choice, and save it on a signed-in mother's profile. */
export async function setLocale(locale: string) {
  if (!isLocale(locale)) return;
  await writeCookie(locale);

  const session = await getAppSession();
  if (session?.user.role === "MOTHER" && session.user.motherId) {
    await db.mother.update({
      where: { id: session.user.motherId },
      data: { language: locale },
    });
  }
}

/**
 * Called right after sign-in. A language picked on the login screen wins and is saved
 * to the mother's profile; otherwise her saved language (set by her clinic) is used.
 */
export async function syncLanguageAfterLogin() {
  const session = await getAppSession();
  const motherId = session?.user.motherId;
  if (session?.user.role !== "MOTHER" || !motherId) return;

  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(chosen)) {
    await db.mother.update({ where: { id: motherId }, data: { language: chosen } });
    return;
  }
  const mother = await db.mother.findUnique({
    where: { id: motherId },
    select: { language: true },
  });
  if (isLocale(mother?.language)) await writeCookie(mother.language);
}
