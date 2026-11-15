import { db } from "@/lib/db";
import { ServiceError } from "./errors";

/**
 * Where to send a mother who needs a doctor. The MVP uses one default referral facility:
 * the first other facility that can do a caesarean and has blood, otherwise any other one.
 */
export async function findReferralFacility(fromFacilityId: string) {
  const destination =
    (await db.facility.findFirst({
      where: { id: { not: fromFacilityId }, hasCSection: true, hasBlood: true },
      orderBy: { name: "asc" },
    })) ??
    (await db.facility.findFirst({
      where: { id: { not: fromFacilityId } },
      orderBy: { name: "asc" },
    }));
  if (!destination)
    throw new ServiceError("No other facility is set up to receive referrals.");
  return destination;
}
