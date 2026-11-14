import type { ActorType, Channel, EmergencyKind } from "@/lib/generated/prisma/enums";
import { db } from "@/lib/db";
import { requirePermission, type AppSession } from "@/lib/rbac";
import { gestationalAge, startOfUtcDay } from "@/lib/schedule";
import { logAudit } from "./audit";
import { ServiceError } from "./errors";
import { displayPhone, tryEmail, trySms } from "./notifications";

/** A second alert for the same mother inside this window returns the first one. */
export const EMERGENCY_DEDUPE_MINUTES = 10;

export const EMERGENCY_KIND_TEXT: Record<EmergencyKind, string> = {
  BLEEDING: "bleeding",
  LABOUR: "labour",
  FITS: "fits",
  BABY: "a problem with the baby",
  OTHER: "an emergency",
};

export type TriggerEmergencyInput = {
  motherId: string;
  kind: EmergencyKind;
  source: Channel;
  /** Who raised it: a signed-in user, or the USSD / SMS webhook acting for her. */
  actor: { type: ActorType; userId?: string | null };
  /**
   * An id generated on the phone. Sending the same id twice (a repeated offline sync)
   * returns the existing emergency instead of creating a second one.
   */
  clientId?: string;
};

/**
 * Raise an emergency for a mother: record it at her facility, then text her family contacts
 * and the facility, and email the clinic staff.
 *
 * This is the low-level step. It does NOT check who is asking, so callers must have
 * authorised the request first: a signed-in user (see `triggerEmergencyForSession`), or a
 * USSD / SMS webhook that matched the caller's phone number to the mother.
 *
 * Alerts are best-effort: if an SMS fails the emergency is still recorded and shown.
 */
export async function triggerEmergency(input: TriggerEmergencyInput) {
  if (input.clientId) {
    const existing = await db.emergency.findUnique({ where: { id: input.clientId } });
    if (existing) return { emergency: existing, created: false };
  }

  const mother = await db.mother.findUnique({
    where: { id: input.motherId },
    include: {
      facility: { select: { id: true, name: true, phone: true } },
      familyContacts: { select: { name: true, phone: true } },
    },
  });
  if (!mother) throw new ServiceError("We couldn't find that mother.");

  const since = new Date(Date.now() - EMERGENCY_DEDUPE_MINUTES * 60_000);
  const recent = await db.emergency.findFirst({
    where: {
      motherId: mother.id,
      status: { in: ["OPEN", "ACKNOWLEDGED"] },
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
  });
  if (recent) return { emergency: recent, created: false };

  const emergency = await db.emergency.create({
    data: {
      ...(input.clientId ? { id: input.clientId } : {}),
      motherId: mother.id,
      source: input.source,
      kind: input.kind,
      facilityId: mother.facilityId,
    },
  });

  await logAudit({
    actorId: input.actor.userId ?? null,
    actorType: input.actor.type,
    action: "emergency.trigger",
    entity: "Emergency",
    entityId: emergency.id,
  });

  // Alerts go out after the emergency is saved, and never block or fail it.
  const weeks =
    mother.status === "PREGNANT"
      ? gestationalAge(mother.lmp, startOfUtcDay(new Date())).weeks
      : null;
  const what = EMERGENCY_KIND_TEXT[input.kind];
  const staff = await db.user.findMany({
    where: { role: "CLINIC", facilityId: mother.facilityId, active: true },
    select: { email: true },
  });

  await Promise.allSettled([
    // Family: who needs help and who is on it. No more health detail than needed.
    ...mother.familyContacts.map((c) =>
      trySms(
        c.phone,
        `Aboyun: ${mother.name} needs urgent help (${what}). Please call her or go to her now. ` +
          `${mother.facility.name} (${displayPhone(mother.facility.phone)}) has been told.`,
      ),
    ),
    // The facility: enough to act on.
    trySms(
      mother.facility.phone,
      `Aboyun EMERGENCY: ${mother.name}${weeks !== null ? `, ${weeks} weeks` : ""}, ${what}. ` +
        `Reported by ${input.source}. Phone ${displayPhone(mother.phone)}. Open your dashboard.`,
    ),
    ...staff.map((u) =>
      tryEmail({
        to: u.email,
        subject: `Emergency: ${mother.name}`,
        text:
          `${mother.name}${weeks !== null ? `, ${weeks} weeks,` : ""} has reported ${what} ` +
          `by ${input.source}.\nPhone: ${displayPhone(mother.phone)}\n` +
          `Open the Emergencies page in your Aboyun dashboard to acknowledge it.`,
      }),
    ),
  ]);

  return { emergency, created: true };
}

/** A signed-in mother raising an emergency for herself (app button, offline sync). */
export async function triggerEmergencyForSession(
  session: AppSession,
  input: { kind: EmergencyKind; source?: Channel; clientId?: string },
) {
  requirePermission(session, "emergency:trigger");
  if (session.user.role !== "MOTHER" || !session.user.motherId) {
    throw new ServiceError("Only a mother can raise an emergency for herself here.");
  }
  return triggerEmergency({
    motherId: session.user.motherId,
    kind: input.kind,
    source: input.source ?? "APP",
    clientId: input.clientId,
    actor: { type: "USER", userId: session.user.id },
  });
}
