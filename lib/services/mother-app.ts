import { db } from "@/lib/db";
import type { EmergencyKind } from "@/lib/generated/prisma/enums";
import type { PullResponse, SyncOp } from "@/lib/offline/protocol";
import {
  motherChildScope,
  requirePermission,
  scopeWhere,
  type AppSession,
} from "@/lib/rbac";
import { parseIsoDate } from "@/lib/clinic-validation";
import { assessSymptoms } from "@/lib/symptoms";
import { logAudit } from "./audit";
import { triggerEmergencyForSession } from "./emergency";
import { ServiceError } from "./errors";

const DAY_MS = 86_400_000;
const CURSOR_OVERLAP_MS = 5_000;

function motherIdOf(session: AppSession): string {
  if (session.user.role !== "MOTHER" || !session.user.motherId) {
    throw new ServiceError("This is for mothers only.");
  }
  return session.user.motherId;
}

/** A phone clock can be wrong: never store a time in the future or before 2020. */
function sanePast(iso: string | undefined): Date {
  const now = new Date();
  const t = iso ? new Date(iso) : now;
  if (Number.isNaN(t.getTime()) || t > now || t.getFullYear() < 2020) return now;
  return t;
}

/** Everything the mother home screen needs, scoped to her. Pass `since` for changes only. */
export async function getHomeData(
  session: AppSession,
  since?: Date,
): Promise<PullResponse> {
  requirePermission(session, "mother:read");
  motherIdOf(session);
  const cursor = new Date(Date.now() - CURSOR_OVERLAP_MS);
  const changed = since ? { updatedAt: { gt: since } } : {};

  const mother = await db.mother.findFirst({
    where: scopeWhere(session),
    include: { facility: { select: { name: true, phone: true } } },
  });
  if (!mother) throw new ServiceError("We could not find your record.");

  const [visits, reminders, reports, flags] = await Promise.all([
    db.visit.findMany({
      where: { ...motherChildScope(session), ...changed },
      orderBy: { dueDate: "asc" },
      take: 50,
    }),
    db.reminder.findMany({
      where: { ...motherChildScope(session), ...changed },
      orderBy: { dueAt: "desc" },
      take: 60,
    }),
    db.symptomReport.findMany({
      where: { ...motherChildScope(session), ...changed },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    db.riskFlag.findMany({
      where: { ...motherChildScope(session), resolvedAt: null },
      select: { level: true },
    }),
  ]);

  const rank = { LOW: 0, MEDIUM: 1, HIGH: 2 } as const;
  const highest = flags.reduce<"LOW" | "MEDIUM" | "HIGH" | null>(
    (best, f) => (best === null || rank[f.level] > rank[best] ? f.level : best),
    null,
  );

  return {
    cursor: cursor.toISOString(),
    mother: {
      id: mother.id,
      name: mother.name,
      status: mother.status,
      riskLevel: mother.riskLevel,
      language: mother.language,
      lmp: mother.lmp.toISOString(),
      edd: mother.edd.toISOString(),
    },
    facility: { name: mother.facility.name, phone: mother.facility.phone },
    flags: { open: flags.length, highest },
    visits: visits.map((v) => ({
      id: v.id,
      kind: v.kind,
      dueDate: v.dueDate.toISOString(),
      attendedAt: v.attendedAt?.toISOString() ?? null,
      contactNo: v.contactNo,
      gestationWeek: v.gestationWeek,
      updatedAt: v.updatedAt.toISOString(),
    })),
    reminders: reminders.map((r) => ({
      id: r.id,
      kind: r.kind,
      dueAt: r.dueAt.toISOString(),
      status: r.status,
      updatedAt: r.updatedAt.toISOString(),
    })),
    reports: reports.map((r) => ({
      id: r.id,
      source: r.source,
      signs: (r.signs ?? {}) as Record<string, boolean>,
      result: r.result,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    })),
  };
}

/** Save a symptom check. The result is worked out here, never trusted from the phone. */
export async function saveSymptomReport(
  session: AppSession,
  input: { id?: string; signs: Record<string, boolean>; createdAt?: string },
) {
  requirePermission(session, "symptom:report");
  const motherId = motherIdOf(session);

  if (input.id) {
    const existing = await db.symptomReport.findUnique({ where: { id: input.id } });
    if (existing) {
      if (existing.motherId !== motherId) throw new ServiceError("Invalid record id.");
      return { report: existing, created: false };
    }
  }

  const result = assessSymptoms(input.signs);
  const report = await db.symptomReport.create({
    data: {
      ...(input.id ? { id: input.id } : {}),
      motherId,
      source: "APP",
      signs: input.signs,
      result,
      createdAt: sanePast(input.createdAt),
    },
  });
  await logAudit({
    actorId: session.user.id,
    action: "symptom.report",
    entity: "SymptomReport",
    entityId: report.id,
  });
  return { report, created: true };
}

/** "I took my tablet today": one CONFIRMED TABLET reminder per day. */
export async function confirmTablet(
  session: AppSession,
  input: { id?: string; day: string },
) {
  requirePermission(session, "tablet:confirm");
  const motherId = motherIdOf(session);
  const dayStart = parseIsoDate(input.day);
  if (!dayStart) throw new ServiceError("Invalid day.");
  if (dayStart.getTime() > Date.now() + DAY_MS) throw new ServiceError("Invalid day.");

  const existing = await db.reminder.findFirst({
    where: {
      motherId,
      kind: "TABLET",
      dueAt: { gte: dayStart, lt: new Date(dayStart.getTime() + DAY_MS) },
    },
    orderBy: { createdAt: "asc" },
  });
  if (existing) {
    if (existing.status === "CONFIRMED") return { reminder: existing, created: false };
    const reminder = await db.reminder.update({
      where: { id: existing.id },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    });
    await logAudit({
      actorId: session.user.id,
      action: "tablet.confirm",
      entity: "Reminder",
      entityId: reminder.id,
    });
    return { reminder, created: false };
  }

  if (input.id) {
    const clash = await db.reminder.findUnique({ where: { id: input.id } });
    if (clash) {
      if (clash.motherId !== motherId) throw new ServiceError("Invalid record id.");
      return { reminder: clash, created: false };
    }
  }
  const reminder = await db.reminder.create({
    data: {
      ...(input.id ? { id: input.id } : {}),
      motherId,
      kind: "TABLET",
      dueAt: dayStart,
      status: "CONFIRMED",
      confirmedAt: new Date(),
    },
  });
  await logAudit({
    actorId: session.user.id,
    action: "tablet.confirm",
    entity: "Reminder",
    entityId: reminder.id,
  });
  return { reminder, created: true };
}

/** Raise an emergency from the app (the finished emergency service does the work). */
export async function raiseEmergency(
  session: AppSession,
  input: { kind: EmergencyKind; clientId?: string },
) {
  motherIdOf(session);
  return triggerEmergencyForSession(session, {
    kind: input.kind,
    source: "APP",
    clientId: input.clientId,
  });
}

/** Apply one outbox operation. Safe to repeat: the same id never creates a second row. */
export async function applySyncOp(session: AppSession, op: SyncOp) {
  switch (op.type) {
    case "symptom":
      await saveSymptomReport(session, op);
      return;
    case "tablet":
      await confirmTablet(session, op);
      return;
    case "emergency":
      await raiseEmergency(session, { kind: op.kind, clientId: op.id });
      return;
  }
}
