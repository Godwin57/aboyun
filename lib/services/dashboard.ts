import { cache } from "react";
import type { EmergencyKind, Channel } from "@/lib/generated/prisma/enums";
import { db } from "@/lib/db";
import { isReferCode } from "@/lib/risk";
import {
  motherChildScope,
  requirePermission,
  scopeWhere,
  type AppSession,
} from "@/lib/rbac";
import { gestationalAge, startOfUtcDay } from "@/lib/schedule";

const DAY_MS = 86_400_000;
/** How far ahead "visits due" looks. */
export const UPCOMING_DAYS = 7;

export type AttentionItem = {
  kind: "refer" | "overdue" | "flag";
  motherId: string;
  name: string;
  /** Flag reason for refer/flag items. */
  reason?: string;
  /** When the flag was raised. */
  since?: Date;
  /** For refer items: she has been sent on already. */
  referred?: boolean;
  /** For overdue items. */
  contactNo?: number | null;
  dueDate?: Date;
};

export type OpenEmergency = {
  id: string;
  motherId: string;
  motherName: string;
  kind: EmergencyKind;
  source: Channel;
  createdAt: Date;
  weeks: number;
};

/** Everything the clinic dashboard shows, scoped to the signed-in user's facility. */
export async function getDashboard(session: AppSession) {
  requirePermission(session, "mother:read");

  const scope = scopeWhere(session);
  const childScope = motherChildScope(session);
  const today = startOfUtcDay(new Date());
  // Today up to and including the 7th day ahead.
  const windowEnd = new Date(today.getTime() + (UPCOMING_DAYS + 1) * DAY_MS);
  const emergencyScope =
    session.user.role === "CLINIC" ? { facilityId: session.user.facilityId ?? "" } : {};

  const [
    byStatus,
    byRisk,
    overdueGroups,
    upcoming,
    referFlags,
    otherFlags,
    overdueVisits,
    emergencies,
  ] = await Promise.all([
    db.mother.groupBy({ by: ["status"], where: scope, _count: { _all: true } }),
    db.mother.groupBy({ by: ["riskLevel"], where: scope, _count: { _all: true } }),
    db.visit.groupBy({
      by: ["motherId"],
      where: {
        kind: "ANC",
        attendedAt: null,
        dueDate: { lt: today },
        mother: { ...scope, status: "PREGNANT" },
      },
    }),
    db.visit.findMany({
      where: {
        kind: "ANC",
        attendedAt: null,
        dueDate: { gte: today, lt: windowEnd },
        ...childScope,
      },
      orderBy: { dueDate: "asc" },
      take: 8,
      include: { mother: { select: { id: true, name: true } } },
    }),
    db.riskFlag.findMany({
      where: { resolvedAt: null, level: "HIGH", ...childScope },
      orderBy: { createdAt: "asc" },
      include: { mother: { select: { id: true, name: true } } },
    }),
    db.riskFlag.findMany({
      where: { resolvedAt: null, level: "MEDIUM", ...childScope },
      orderBy: { createdAt: "asc" },
      take: 5,
      include: { mother: { select: { id: true, name: true } } },
    }),
    db.visit.findMany({
      where: {
        kind: "ANC",
        attendedAt: null,
        dueDate: { lt: today },
        mother: { ...scope, status: "PREGNANT" },
      },
      orderBy: { dueDate: "asc" },
      take: 40,
      include: { mother: { select: { id: true, name: true } } },
    }),
    db.emergency.findMany({
      where: { status: "OPEN", ...emergencyScope },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { mother: { select: { id: true, name: true, lmp: true } } },
    }),
  ]);

  const countStatus = (s: string) =>
    byStatus.find((g) => g.status === s)?._count._all ?? 0;
  const countRisk = (r: string) =>
    byRisk.find((g) => g.riskLevel === r)?._count._all ?? 0;
  const pregnant = countStatus("PREGNANT");
  const postnatal = countStatus("POSTNATAL");

  // "Needs attention": mothers to refer first, then missed visits, then medium flags.
  const items: AttentionItem[] = [];
  const seen = new Set<string>();
  for (const f of referFlags.filter((flag) => isReferCode(flag.code))) {
    if (seen.has(f.motherId)) continue;
    seen.add(f.motherId);
    items.push({
      kind: "refer",
      motherId: f.motherId,
      name: f.mother.name,
      reason: f.reason,
      since: f.createdAt,
      referred: f.referralId !== null,
    });
  }
  for (const v of overdueVisits) {
    if (seen.has(v.motherId)) continue;
    seen.add(v.motherId);
    items.push({
      kind: "overdue",
      motherId: v.motherId,
      name: v.mother.name,
      contactNo: v.contactNo,
      dueDate: v.dueDate,
    });
  }
  for (const f of otherFlags) {
    if (seen.has(f.motherId)) continue;
    seen.add(f.motherId);
    items.push({
      kind: "flag",
      motherId: f.motherId,
      name: f.mother.name,
      reason: f.reason,
      since: f.createdAt,
    });
  }

  const openEmergencies: OpenEmergency[] = emergencies.map((e) => ({
    id: e.id,
    motherId: e.motherId,
    motherName: e.mother.name,
    kind: e.kind,
    source: e.source,
    createdAt: e.createdAt,
    weeks: gestationalAge(e.mother.lmp, today).weeks,
  }));

  return {
    totals: {
      mothers: pregnant + postnatal,
      pregnant,
      postnatal,
      high: countRisk("HIGH"),
      medium: countRisk("MEDIUM"),
      needReferral: referFlags.filter((f) => isReferCode(f.code) && f.referralId === null)
        .length,
      dueSoon: upcoming.length,
      overdue: overdueGroups.length,
    },
    attention: items.slice(0, 6),
    upcoming: upcoming.map((v) => ({
      motherId: v.motherId,
      name: v.mother.name,
      contactNo: v.contactNo,
      week: v.gestationWeek,
      dueDate: v.dueDate,
    })),
    emergencies: openEmergencies,
    windowStart: today,
    windowEnd: new Date(windowEnd.getTime() - DAY_MS),
  };
}

/** What the sidebar shows: who is signed in, at which facility, and open emergencies. */
export const getClinicShellInfo = cache(async (session: AppSession) => {
  const facilityId = session.user.facilityId ?? "";
  const [user, facility, openEmergencies] = await Promise.all([
    db.user.findUnique({ where: { id: session.user.id }, select: { name: true } }),
    db.facility.findUnique({ where: { id: facilityId }, select: { name: true } }),
    db.emergency.count({ where: { status: "OPEN", facilityId } }),
  ]);
  return {
    userName: user?.name ?? "Clinic staff",
    facilityName: facility?.name ?? "Your clinic",
    openEmergencies,
  };
});
