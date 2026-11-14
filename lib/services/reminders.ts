// Reminders: sending due reminders by SMS and confirming them from a reply.
import { db } from "@/lib/db";
import { formatDay } from "@/lib/format";
import { matchVisit, missedCutoff } from "@/lib/reminder-rules";
import { visitReminderText } from "@/lib/reminder-texts";
import { logAudit } from "./audit";
import { tryEmail, trySms } from "./notifications";

const DEFAULT_LIMIT = 200;
const DAY_MS = 86_400_000;

export type ReminderRunResult = {
  sent: number;
  skipped: number;
  failed: number;
  confirmed: number;
  missed: number;
};

/**
 * Send the visit reminders that are due. Safe to run twice: each reminder is claimed
 * (PENDING -> SENT) before it is sent, so only one run can send it.
 */
export async function sendDueReminders(
  opts: { now?: Date; limit?: number } = {},
): Promise<ReminderRunResult> {
  const now = opts.now ?? new Date();
  const limit = Math.max(1, opts.limit ?? DEFAULT_LIMIT);
  const result: ReminderRunResult = {
    sent: 0,
    skipped: 0,
    failed: 0,
    confirmed: 0,
    missed: 0,
  };

  // Sent, never confirmed, and more than 4 days past due. One sent in the last day is
  // left alone, so a reminder sent late (after a skipped cron run) is not missed at once.
  const missed = await db.reminder.updateMany({
    where: {
      kind: "VISIT",
      status: "SENT",
      dueAt: { lt: missedCutoff(now) },
      sentAt: { lt: new Date(now.getTime() - DAY_MS) },
    },
    data: { status: "MISSED" },
  });
  result.missed = missed.count;

  const due = await db.reminder.findMany({
    where: { status: "PENDING", dueAt: { lte: now } },
    orderBy: { dueAt: "asc" },
    take: limit,
    include: {
      mother: {
        select: {
          name: true,
          phone: true,
          email: true,
          language: true,
          facility: { select: { name: true } },
          visits: {
            where: { kind: "ANC" },
            select: { id: true, dueDate: true, attendedAt: true },
          },
        },
      },
    },
  });

  for (const reminder of due) {
    try {
      const { mother } = reminder;

      if (reminder.kind !== "VISIT") {
        result.skipped++;
        continue;
      }

      const visit = matchVisit(reminder.dueAt, mother.visits);
      if (!visit) {
        // Already attended, or no visit to remind her about: nothing to send.
        const done = await db.reminder.updateMany({
          where: { id: reminder.id, status: "PENDING" },
          data: { status: "CONFIRMED", confirmedAt: now },
        });
        result.confirmed += done.count;
        continue;
      }

      if (!mother.phone && !mother.email) {
        result.skipped++;
        continue;
      }

      const claim = await db.reminder.updateMany({
        where: { id: reminder.id, status: "PENDING" },
        data: { status: "SENT", sentAt: now },
      });
      if (claim.count !== 1) {
        result.skipped++; // another run took it
        continue;
      }

      const { subject, text } = visitReminderText({
        language: mother.language,
        name: mother.name,
        date: formatDay(visit.dueDate),
        facility: mother.facility.name,
      });
      const ok = mother.phone
        ? await trySms(mother.phone, text)
        : await tryEmail({ to: mother.email!, subject, text });

      if (ok) {
        result.sent++;
      } else {
        await db.reminder.updateMany({
          where: { id: reminder.id, status: "SENT" },
          data: { status: "PENDING", sentAt: null },
        });
        result.failed++;
      }
    } catch (error) {
      console.error(`Reminder ${reminder.id} failed`, error);
      result.failed++;
    }
  }

  return result;
}

/**
 * A mother replied "1" to a reminder SMS: mark her most recent SENT reminder CONFIRMED.
 * The inbound SMS route calls this with the sender's phone number (E.164).
 * Returns whether anything was confirmed.
 *
 * Contract: do not change this signature.
 */
export async function confirmLatestReminderByPhone(
  phone: string,
): Promise<{ confirmed: boolean }> {
  const reminder = await db.reminder.findFirst({
    where: { status: "SENT", mother: { phone } },
    orderBy: [{ sentAt: "desc" }, { dueAt: "desc" }],
    select: { id: true },
  });
  if (!reminder) return { confirmed: false };

  const done = await db.reminder.updateMany({
    where: { id: reminder.id, status: "SENT" },
    data: { status: "CONFIRMED", confirmedAt: new Date() },
  });
  if (done.count !== 1) return { confirmed: false };

  await logAudit({
    actorType: "SMS",
    action: "reminder.confirm",
    entity: "Reminder",
    entityId: reminder.id,
  });
  return { confirmed: true };
}
