import { Prisma } from "@/lib/generated/prisma/client";
import type { RiskLevel, MotherStatus } from "@/lib/generated/prisma/enums";
import { db } from "@/lib/db";
import { parseIsoDate, type registerMotherSchema } from "@/lib/clinic-validation";
import { normalizeNgPhone, placeholderEmailFor } from "@/lib/phone";
import { requirePermission, scopeWhere, type AppSession } from "@/lib/rbac";
import { ancSchedule, eddFromLmp, gestationalAge, startOfUtcDay } from "@/lib/schedule";
import type { z } from "zod";
import { logAudit } from "./audit";
import { ServiceError } from "./errors";
import { sendInvite } from "./invites";

const DAY_MS = 86_400_000;
export const MOTHERS_PAGE_SIZE = 8;

export type RegisterMotherData = z.output<typeof registerMotherSchema>;

/**
 * CLINIC: register a mother at the clinic's own facility. Creates her login (she
 * sets her own password from an emailed or SMS link), her record, her family
 * contacts, her eight antenatal visits and her visit reminders, all in one go.
 */
export async function registerMother(session: AppSession, data: RegisterMotherData) {
  requirePermission(session, "mother:create");
  const facilityId = session.user.facilityId;
  if (session.user.role !== "CLINIC" || !facilityId) {
    throw new ServiceError("Only a clinic can register a mother.");
  }

  const phone = data.phone ? normalizeNgPhone(data.phone) : null;
  const email = data.email ? data.email.toLowerCase() : null;
  const loginEmail = email ?? (phone ? placeholderEmailFor(phone) : null);
  const lmp = parseIsoDate(data.lmp);
  if (!loginEmail || !lmp) throw new ServiceError("Check her details and try again.");

  const taken = await db.user.findFirst({
    where: { OR: [{ email: loginEmail }, ...(phone ? [{ phoneNumber: phone }] : [])] },
    select: { id: true },
  });
  if (taken) throw new ServiceError("This phone number or email is already registered.");

  const planned = ancSchedule(lmp);
  const now = new Date();

  let motherId: string;
  try {
    motherId = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: loginEmail,
          phoneNumber: phone,
          role: "MOTHER",
        },
      });
      const mother = await tx.mother.create({
        data: {
          userId: user.id,
          name: data.name,
          phone,
          email,
          language: data.language,
          lmp,
          edd: eddFromLmp(lmp),
          facilityId,
          consentAt: now,
          consentRecordedById: session.user.id,
          familyContacts: {
            create: data.familyContacts.map((c) => ({
              name: c.name,
              phone: normalizeNgPhone(c.phone),
              relation: c.relation,
            })),
          },
        },
      });
      await tx.visit.createMany({
        data: planned.map((p) => ({
          motherId: mother.id,
          kind: "ANC" as const,
          contactNo: p.contactNo,
          gestationWeek: p.week,
          dueDate: p.dueDate,
        })),
      });
      // A reminder goes out two days before each visit that is still ahead.
      const reminders = planned
        .map((p) => ({ dueAt: new Date(p.dueDate.getTime() - 2 * DAY_MS) }))
        .filter((r) => r.dueAt.getTime() > now.getTime());
      if (reminders.length > 0) {
        await tx.reminder.createMany({
          data: reminders.map((r) => ({
            motherId: mother.id,
            kind: "VISIT" as const,
            dueAt: r.dueAt,
          })),
        });
      }
      return mother.id;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ServiceError("This phone number or email is already registered.");
    }
    throw error;
  }

  await logAudit({
    actorId: session.user.id,
    action: "mother.create",
    entity: "Mother",
    entityId: motherId,
  });

  // The mother exists even if the link fails to send; a clinic can resend later.
  let inviteSent = true;
  try {
    await sendInvite(loginEmail);
  } catch (error) {
    inviteSent = false;
    console.error("Failed to send mother invite", error);
  }

  return { motherId, inviteSent, via: email ? ("email" as const) : ("sms" as const) };
}

export type MotherListFilters = {
  q?: string;
  risk?: RiskLevel;
  stage?: MotherStatus;
  page?: number;
};

export type MotherRow = {
  id: string;
  name: string;
  phone: string | null;
  riskLevel: RiskLevel;
  /** The most serious open flag, as a short reason. */
  reason: string | null;
  status: MotherStatus;
  edd: Date;
  weeks: number;
  nextVisit: { contactNo: number | null; dueDate: Date; overdue: boolean } | null;
  lastReading: {
    bpSys: number | null;
    bpDia: number | null;
    hbGdl: number | null;
  } | null;
};

/** Mothers the session may see, highest risk first, with filters and paging. */
export async function listMothers(session: AppSession, filters: MotherListFilters = {}) {
  requirePermission(session, "mother:read");
  const scope = scopeWhere(session);
  const where: Prisma.MotherWhereInput = { ...scope };

  const q = filters.q?.trim();
  if (q) {
    const digits = q.replace(/\D/g, "").replace(/^0/, "");
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
    ];
  }
  if (filters.risk) where.riskLevel = filters.risk;
  if (filters.stage) where.status = filters.stage;

  const page = Math.max(1, filters.page ?? 1);
  const [total, grouped, rows] = await Promise.all([
    db.mother.count({ where }),
    db.mother.groupBy({ by: ["riskLevel"], where: scope, _count: { _all: true } }),
    db.mother.findMany({
      where,
      orderBy: [{ riskLevel: "desc" }, { name: "asc" }],
      skip: (page - 1) * MOTHERS_PAGE_SIZE,
      take: MOTHERS_PAGE_SIZE,
      include: {
        visits: { orderBy: { dueDate: "asc" } },
        riskFlags: { where: { resolvedAt: null }, orderBy: { createdAt: "desc" } },
      },
    }),
  ]);

  const today = startOfUtcDay(new Date());
  const counts = { ALL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const g of grouped) {
    counts[g.riskLevel] = g._count._all;
    counts.ALL += g._count._all;
  }

  const mothers: MotherRow[] = rows.map((m) => {
    const upcoming = m.visits.find((v) => v.attendedAt === null);
    const attended = m.visits.filter((v) => v.attendedAt !== null && v.bpSys !== null);
    const last = attended[attended.length - 1];
    const topFlag = m.riskFlags.find((f) => f.level === "HIGH") ?? m.riskFlags[0];
    return {
      id: m.id,
      name: m.name,
      phone: m.phone,
      riskLevel: m.riskLevel,
      reason: topFlag?.reason ?? null,
      status: m.status,
      edd: m.edd,
      weeks: gestationalAge(m.lmp, today).weeks,
      nextVisit: upcoming
        ? {
            contactNo: upcoming.contactNo,
            dueDate: upcoming.dueDate,
            overdue: upcoming.dueDate.getTime() < today.getTime(),
          }
        : null,
      lastReading: last
        ? { bpSys: last.bpSys, bpDia: last.bpDia, hbGdl: last.hbGdl }
        : null,
    };
  });

  return {
    mothers,
    total,
    page,
    pageSize: MOTHERS_PAGE_SIZE,
    counts,
  };
}

/** One mother's full record, or null if she doesn't exist or isn't at the clinic. */
export async function getMother(session: AppSession, id: string) {
  requirePermission(session, "mother:read");
  const mother = await db.mother.findFirst({
    // AND, so the session's scope always applies whatever id is asked for.
    where: { AND: [scopeWhere(session), { id }] },
    include: {
      facility: { select: { id: true, name: true } },
      familyContacts: { orderBy: { createdAt: "asc" } },
      visits: { orderBy: { dueDate: "asc" } },
      riskFlags: { orderBy: { createdAt: "desc" } },
      referrals: {
        orderBy: { createdAt: "desc" },
        include: { toFacility: { select: { name: true } } },
      },
    },
  });
  if (!mother) return null;

  await logAudit({
    actorId: session.user.id,
    action: "mother.read",
    entity: "Mother",
    entityId: mother.id,
  });
  return mother;
}
