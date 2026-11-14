import type { Prisma } from "@/lib/generated/prisma/client";
import { db } from "@/lib/db";
import { parseIsoDate, type recordVisitSchema } from "@/lib/clinic-validation";
import { assessVisit, isReferCode, overallRisk } from "@/lib/risk";
import {
  motherChildScope,
  requirePermission,
  scopeWhere,
  type AppSession,
} from "@/lib/rbac";
import { ancSchedule } from "@/lib/schedule";
import type { z } from "zod";
import { logAudit } from "./audit";
import { ServiceError } from "./errors";

export type RecordVisitData = z.output<typeof recordVisitSchema>;

type Tx = Prisma.TransactionClient;

/** A mother's overall risk is the highest of her open flags. */
async function recomputeMotherRisk(tx: Tx, motherId: string) {
  const open = await tx.riskFlag.findMany({
    where: { motherId, resolvedAt: null },
    select: { level: true, resolvedAt: true },
  });
  const riskLevel = overallRisk(open);
  await tx.mother.update({ where: { id: motherId }, data: { riskLevel } });
  return riskLevel;
}

/**
 * Record an antenatal visit: save the readings, run the risk rules, raise a flag for
 * each reason, and update the mother's overall risk.
 */
export async function recordVisit(session: AppSession, data: RecordVisitData) {
  requirePermission(session, "visit:record");

  const mother = await db.mother.findFirst({
    where: { AND: [scopeWhere(session), { id: data.motherId }] },
    select: { id: true, lmp: true },
  });
  if (!mother) throw new ServiceError("We couldn't find that mother.");

  const attendedAt = parseIsoDate(data.attendedOn);
  if (!attendedAt) throw new ServiceError("Enter the date she came.");

  const planned = ancSchedule(mother.lmp).find((p) => p.contactNo === data.contactNo);
  const existing = await db.visit.findUnique({
    where: {
      motherId_kind_contactNo: {
        motherId: mother.id,
        kind: "ANC",
        contactNo: data.contactNo,
      },
    },
    select: { id: true, attendedAt: true },
  });
  if (existing?.attendedAt)
    throw new ServiceError("This visit has already been recorded.");

  const assessment = assessVisit({
    bpSys: data.bpSys,
    bpDia: data.bpDia,
    hbGdl: data.hbGdl,
    signs: data.signs,
  });

  // Notes live in the same JSON as the danger signs, under "notes".
  const signs: Prisma.InputJsonObject = {
    ...Object.fromEntries(Object.entries(data.signs).filter(([, on]) => on === true)),
    ...(data.notes ? { notes: data.notes } : {}),
  };
  const readings = {
    attendedAt,
    bpSys: data.bpSys,
    bpDia: data.bpDia,
    weightKg: data.weightKg ?? null,
    hbGdl: data.hbGdl ?? null,
    signs,
    recordedById: session.user.id,
  };

  const result = await db.$transaction(async (tx) => {
    const visit = existing
      ? await tx.visit.update({ where: { id: existing.id }, data: readings })
      : await tx.visit.create({
          data: {
            ...readings,
            motherId: mother.id,
            kind: "ANC",
            contactNo: data.contactNo,
            gestationWeek: planned?.week ?? null,
            dueDate: planned?.dueDate ?? attendedAt,
          },
        });

    // One open flag per rule: a repeat of the same problem doesn't pile up flags.
    const openCodes = new Set(
      (
        await tx.riskFlag.findMany({
          where: { motherId: mother.id, resolvedAt: null },
          select: { code: true },
        })
      ).map((f) => f.code),
    );
    for (const reason of assessment.reasons) {
      if (openCodes.has(reason.code)) continue;
      await tx.riskFlag.create({
        data: {
          motherId: mother.id,
          reason: reason.text,
          level: reason.level,
          code: reason.code,
          sourceId: visit.id,
        },
      });
    }

    const riskLevel = await recomputeMotherRisk(tx, mother.id);
    return { visitId: visit.id, riskLevel };
  });

  await logAudit({
    actorId: session.user.id,
    action: "visit.record",
    entity: "Visit",
    entityId: result.visitId,
  });

  return { ...result, assessment };
}

/**
 * Refer a mother to another facility. The destination is the first other facility that
 * can do a caesarean and has blood (the MVP uses one default referral facility), else
 * any other facility. Her open "refer now" flags are linked to the referral.
 */
export async function referMother(
  session: AppSession,
  input: { motherId: string; reason?: string },
) {
  requirePermission(session, "visit:record");

  const mother = await db.mother.findFirst({
    where: { AND: [scopeWhere(session), { id: input.motherId }] },
    select: { id: true, facilityId: true },
  });
  if (!mother) throw new ServiceError("We couldn't find that mother.");

  const flags = await db.riskFlag.findMany({
    where: { motherId: mother.id, resolvedAt: null, referralId: null },
  });
  const referFlags = flags.filter((f) => isReferCode(f.code));
  if (referFlags.length === 0 && !input.reason) {
    throw new ServiceError("She has no open flag that needs a referral.");
  }

  const destination =
    (await db.facility.findFirst({
      where: { id: { not: mother.facilityId }, hasCSection: true, hasBlood: true },
      orderBy: { name: "asc" },
    })) ??
    (await db.facility.findFirst({
      where: { id: { not: mother.facilityId } },
      orderBy: { name: "asc" },
    }));
  if (!destination)
    throw new ServiceError("No other facility is set up to receive referrals.");

  const reason = input.reason || referFlags.map((f) => f.reason).join("; ");

  const referral = await db.$transaction(async (tx) => {
    const created = await tx.referral.create({
      data: {
        motherId: mother.id,
        fromFacilityId: mother.facilityId,
        toFacilityId: destination.id,
        reason,
        visitId: referFlags.find((f) => f.sourceId)?.sourceId ?? null,
        createdById: session.user.id,
      },
    });
    await tx.riskFlag.updateMany({
      where: { id: { in: referFlags.map((f) => f.id) } },
      data: { referralId: created.id },
    });
    return created;
  });

  await logAudit({
    actorId: session.user.id,
    action: "referral.create",
    entity: "Referral",
    entityId: referral.id,
  });

  return { referralId: referral.id, toFacilityName: destination.name };
}

/** Close a risk flag (for example after the doctor has reviewed her). Lowers her risk if it was the top one. */
export async function resolveFlag(
  session: AppSession,
  input: { flagId: string; note?: string },
) {
  requirePermission(session, "visit:record");

  const flag = await db.riskFlag.findFirst({
    where: { id: input.flagId, resolvedAt: null, ...motherChildScope(session) },
    select: { id: true, motherId: true },
  });
  if (!flag)
    throw new ServiceError("We couldn't find that flag, or it is already closed.");

  await db.$transaction(async (tx) => {
    await tx.riskFlag.update({
      where: { id: flag.id },
      data: {
        resolvedAt: new Date(),
        resolvedById: session.user.id,
        resolutionNote: input.note || null,
      },
    });
    await recomputeMotherRisk(tx, flag.motherId);
  });

  await logAudit({
    actorId: session.user.id,
    action: "flag.resolve",
    entity: "RiskFlag",
    entityId: flag.id,
  });
}
