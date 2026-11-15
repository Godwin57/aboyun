import { db } from "@/lib/db";
import { normalizeNgPhone } from "@/lib/phone";
import { isLang, type Lang } from "@/lib/ussd-texts";

export type Caller =
  | {
      kind: "mother";
      motherId: string;
      name: string;
      lang: Lang;
    }
  | {
      /** A family contact calling or texting on behalf of the mother they are listed under. */
      kind: "family";
      motherId: string;
      /** The mother's name. */
      name: string;
      lang: Lang;
    }
  | { kind: "unknown"; lang: Lang };

const select = { id: true, name: true, language: true } as const;

/**
 * Work out who is on the other end of a USSD session or an SMS from their phone number.
 * A registered mother is herself; a family contact acts for the mother they belong to;
 * anyone else is unknown. This is how webhooks (which have no login) are authorised.
 */
export async function identifyCaller(phone: string): Promise<Caller> {
  const normalized = normalizeNgPhone(phone);
  if (!normalized) return { kind: "unknown", lang: "en" };

  const mother = await db.mother.findFirst({ where: { phone: normalized }, select });
  if (mother) {
    return {
      kind: "mother",
      motherId: mother.id,
      name: mother.name,
      lang: isLang(mother.language) ? mother.language : "en",
    };
  }

  const contact = await db.familyContact.findFirst({
    where: { phone: normalized },
    orderBy: { createdAt: "asc" },
    select: { mother: { select } },
  });
  if (contact) {
    return {
      kind: "family",
      motherId: contact.mother.id,
      name: contact.mother.name,
      lang: isLang(contact.mother.language) ? contact.mother.language : "en",
    };
  }

  return { kind: "unknown", lang: "en" };
}

/** Find a registered mother by the phone number someone typed in. */
export async function findMotherByTypedPhone(typed: string) {
  const normalized = normalizeNgPhone(typed);
  if (!normalized) return null;
  return db.mother.findFirst({ where: { phone: normalized }, select });
}
