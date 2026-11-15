import { db } from "@/lib/db";
import { normalizeNgPhone } from "@/lib/phone";
import { isLang, type Lang } from "@/lib/ussd-texts";

export type Caller =
  | {
      kind: "mother";
      motherId: string;
      name: string;
      /** Her saved language. */
      lang: Lang;
    }
  | { kind: "unknown"; lang: Lang };

/**
 * Work out who is on the other end of a USSD session or an SMS from their phone number.
 *
 * Only a registered mother can use USSD and SMS. Anyone else, including the family contacts
 * listed on a mother's record, is "unknown": family contacts only RECEIVE emergency alerts
 * and cannot use the service themselves.
 */
export async function identifyCaller(phone: string): Promise<Caller> {
  const normalized = normalizeNgPhone(phone);
  if (!normalized) return { kind: "unknown", lang: "en" };

  const mother = await db.mother.findFirst({
    where: { phone: normalized },
    select: { id: true, name: true, language: true },
  });
  if (!mother) return { kind: "unknown", lang: "en" };

  return {
    kind: "mother",
    motherId: mother.id,
    name: mother.name,
    lang: isLang(mother.language) ? mother.language : "en",
  };
}
