// Pure rules for visit reminders (no database), so they can be unit tested.

const DAY_MS = 86_400_000;

/** A SENT visit reminder still unconfirmed this long after its due time is MISSED. */
export const MISSED_AFTER_DAYS = 4;
/** The visit a reminder is for is due within this many days after the reminder's dueAt. */
export const VISIT_MATCH_DAYS = 3;

export type VisitLike = { id: string; dueDate: Date; attendedAt: Date | null };

/**
 * The unattended visit a reminder is about: due between `dueAt` and `dueAt + 3 days`.
 * Null when she already attended it (or there is no such visit): nothing to send.
 */
export function matchVisit<T extends VisitLike>(dueAt: Date, visits: T[]): T | null {
  const from = dueAt.getTime();
  const to = from + VISIT_MATCH_DAYS * DAY_MS;
  const matches = visits
    .filter(
      (v) =>
        v.attendedAt === null && v.dueDate.getTime() >= from && v.dueDate.getTime() <= to,
    )
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  return matches[0] ?? null;
}

/** Reminders due now: PENDING with dueAt <= now, oldest first, at most `limit`. */
export function selectDue<T extends { status: string; dueAt: Date }>(
  reminders: T[],
  now: Date,
  limit: number,
): T[] {
  return reminders
    .filter((r) => r.status === "PENDING" && r.dueAt.getTime() <= now.getTime())
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
    .slice(0, limit);
}

/** A SENT visit reminder with dueAt before this is MISSED. */
export function missedCutoff(now: Date): Date {
  return new Date(now.getTime() - MISSED_AFTER_DAYS * DAY_MS);
}

export function isMissed(
  r: { kind: string; status: string; dueAt: Date },
  now: Date,
): boolean {
  return (
    r.kind === "VISIT" &&
    r.status === "SENT" &&
    r.dueAt.getTime() < missedCutoff(now).getTime()
  );
}
