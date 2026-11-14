import { after } from "next/server";
import type { ActorType, Channel, EmergencyKind } from "@/lib/generated/prisma/enums";
import { db } from "@/lib/db";
import { motherChildScope, requirePermission, type AppSession } from "@/lib/rbac";
import { gestationalAge, startOfUtcDay } from "@/lib/schedule";
import { logAudit } from "./audit";
import { ServiceError } from "./errors";
import { findReferralFacility } from "./facilities";
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
  /**
   * Send the alerts after the response has gone out instead of before it. USSD and SMS
   * webhooks must answer within seconds, so they defer the (slow) text messages.
   */
  deferAlerts?: boolean;
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
    select: { id: true, facilityId: true },
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

  // The emergency is saved. The alerts never block or fail it.
  if (input.deferAlerts) {
    after(() => sendEmergencyAlerts(emergency.id));
  } else {
    await sendEmergencyAlerts(emergency.id);
  }

  return { emergency, created: true };
}

/** Text the family and the facility, and email the clinic staff. Never throws. */
export async function sendEmergencyAlerts(emergencyId: string) {
  try {
    const emergency = await db.emergency.findUnique({
      where: { id: emergencyId },
      include: {
        mother: {
          include: {
            facility: { select: { name: true, phone: true } },
            familyContacts: { select: { phone: true } },
          },
        },
      },
    });
    if (!emergency) return;
    const { mother } = emergency;

    const weeks =
      mother.status === "PREGNANT"
        ? gestationalAge(mother.lmp, startOfUtcDay(new Date())).weeks
        : null;
    const what = EMERGENCY_KIND_TEXT[emergency.kind];
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
          `Reported by ${emergency.source}. Phone ${displayPhone(mother.phone)}. Open your dashboard.`,
      ),
      ...staff.map((u) =>
        tryEmail({
          to: u.email,
          subject: `Emergency: ${mother.name}`,
          text:
            `${mother.name}${weeks !== null ? `, ${weeks} weeks,` : ""} has reported ${what} ` +
            `by ${emergency.source}.\nPhone: ${displayPhone(mother.phone)}\n` +
            `Open the Emergencies page in your Aboyun dashboard to acknowledge it.`,
        }),
      ),
    ]);
  } catch (error) {
    console.error(`Emergency alerts for ${emergencyId} failed`, error);
  }
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

// ───────────────────────── Handling emergencies (clinic inbox) ─────────────────────────

/** The emergencies a clinic should see: everything still open, plus recent closed ones. */
export async function listEmergencies(session: AppSession) {
  requirePermission(session, "emergency:handle");
  const scope = motherChildScope(session);
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const include = {
    mother: { select: { id: true, name: true, phone: true, lmp: true, status: true } },
    referredTo: { select: { name: true, phone: true } },
  } as const;

  const [active, closed] = await Promise.all([
    db.emergency.findMany({
      where: { ...scope, status: { not: "CLOSED" } },
      orderBy: { createdAt: "desc" },
      include,
    }),
    db.emergency.findMany({
      where: { ...scope, status: "CLOSED", closedAt: { gte: weekAgo } },
      orderBy: { closedAt: "desc" },
      take: 10,
      include,
    }),
  ]);

  const today = startOfUtcDay(new Date());
  const view = (e: (typeof active)[number]) => ({
    id: e.id,
    kind: e.kind,
    source: e.source,
    status: e.status,
    createdAt: e.createdAt,
    acknowledgedAt: e.acknowledgedAt,
    closedAt: e.closedAt,
    motherId: e.mother.id,
    motherName: e.mother.name,
    motherPhone: e.mother.phone,
    weeks:
      e.mother.status === "PREGNANT" ? gestationalAge(e.mother.lmp, today).weeks : null,
    referredTo: e.referredTo?.name ?? null,
  });
  return { active: active.map(view), closed: closed.map(view) };
}

export type EmergencyView = Awaited<ReturnType<typeof listEmergencies>>["active"][number];

async function loadHandleable(session: AppSession, id: string) {
  requirePermission(session, "emergency:handle");
  const emergency = await db.emergency.findFirst({
    where: { AND: [motherChildScope(session), { id }] },
    include: {
      mother: { select: { name: true, phone: true } },
      facility: { select: { name: true, phone: true } },
    },
  });
  if (!emergency) throw new ServiceError("We couldn't find that emergency.");
  return emergency;
}

/** Staff have seen it and someone is on it. */
export async function acknowledgeEmergency(session: AppSession, id: string) {
  const emergency = await loadHandleable(session, id);
  const done = await db.emergency.updateMany({
    where: { id: emergency.id, status: "OPEN" },
    data: { status: "ACKNOWLEDGED", acknowledgedAt: new Date() },
  });
  if (done.count !== 1) throw new ServiceError("This emergency was already handled.");
  await logAudit({
    actorId: session.user.id,
    action: "emergency.acknowledge",
    entity: "Emergency",
    entityId: emergency.id,
  });
}

/** Send her on to the referral facility, and tell her and that facility. */
export async function referEmergency(session: AppSession, id: string) {
  const emergency = await loadHandleable(session, id);
  const destination = await findReferralFacility(emergency.facilityId);

  const done = await db.emergency.updateMany({
    where: { id: emergency.id, status: { in: ["OPEN", "ACKNOWLEDGED"] } },
    data: {
      status: "REFERRED",
      referredToId: destination.id,
      // Referring counts as acknowledging if nobody had yet.
      ...(emergency.acknowledgedAt ? {} : { acknowledgedAt: new Date() }),
    },
  });
  if (done.count !== 1) throw new ServiceError("This emergency was already handled.");

  await logAudit({
    actorId: session.user.id,
    action: "emergency.refer",
    entity: "Emergency",
    entityId: emergency.id,
  });

  // Best-effort texts: to her, and a heads-up to the facility she is going to.
  await Promise.allSettled([
    trySms(
      emergency.mother.phone,
      `Aboyun: ${emergency.facility.name} is sending you to ${destination.name} ` +
        `(${displayPhone(destination.phone)}). Please go now.`,
    ),
    trySms(
      destination.phone,
      `Aboyun: ${emergency.mother.name} is being referred to you from ${emergency.facility.name} ` +
        `(${EMERGENCY_KIND_TEXT[emergency.kind]}). Phone ${displayPhone(emergency.mother.phone)}.`,
    ),
  ]);

  return { toFacilityName: destination.name };
}

/** It is over: she has been seen, or it was raised by mistake. */
export async function closeEmergency(session: AppSession, id: string) {
  const emergency = await loadHandleable(session, id);
  const done = await db.emergency.updateMany({
    where: { id: emergency.id, status: { not: "CLOSED" } },
    data: { status: "CLOSED", closedAt: new Date() },
  });
  if (done.count !== 1) throw new ServiceError("This emergency is already closed.");
  await logAudit({
    actorId: session.user.id,
    action: "emergency.close",
    entity: "Emergency",
    entityId: emergency.id,
  });
}
