// Pregnancy dates and the antenatal visit schedule.
// Pure functions with no imports, so the browser and the server share one copy.
// All maths is on whole UTC days, so results do not shift with the viewer's time zone.

const DAY_MS = 86_400_000;

/** WHO 2016 recommends eight antenatal contacts, at these weeks of pregnancy. */
export const ANC_CONTACT_WEEKS = [12, 20, 26, 30, 34, 36, 38, 40] as const;

/** Normal pregnancy length counted from the first day of the last period. */
export const PREGNANCY_DAYS = 280;

/** Strip the time so only the calendar day (in UTC) is left. */
export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  return new Date(startOfUtcDay(date).getTime() + days * DAY_MS);
}

/** Estimated due date: 280 days after the first day of the last period. */
export function eddFromLmp(lmp: Date): Date {
  return addDays(lmp, PREGNANCY_DAYS);
}

export type GestationalAge = {
  /** Whole weeks completed. */
  weeks: number;
  /** Extra days (0 to 6). */
  days: number;
  /** Total days since the last period. Negative if `on` is before it. */
  totalDays: number;
};

/** How far along she is on a given day. */
export function gestationalAge(lmp: Date, on: Date): GestationalAge {
  const totalDays = Math.round(
    (startOfUtcDay(on).getTime() - startOfUtcDay(lmp).getTime()) / DAY_MS,
  );
  return {
    weeks: Math.floor(totalDays / 7),
    days: ((totalDays % 7) + 7) % 7,
    totalDays,
  };
}

/** The calendar day she reaches a given week of pregnancy. */
export function dateAtWeek(lmp: Date, week: number): Date {
  return addDays(lmp, week * 7);
}

export type PlannedContact = {
  /** 1 to 8. */
  contactNo: number;
  /** Week of pregnancy the contact is planned for. */
  week: number;
  dueDate: Date;
};

/** The eight antenatal contacts with their due dates, counted from her last period. */
export function ancSchedule(lmp: Date): PlannedContact[] {
  return ANC_CONTACT_WEEKS.map((week, index) => ({
    contactNo: index + 1,
    week,
    dueDate: dateAtWeek(lmp, week),
  }));
}

/**
 * Which planned contact a visit date is closest to, by week. Useful when a mother
 * turns up early or late and the nurse picks the matching contact.
 */
export function nearestContactNo(lmp: Date, on: Date): number {
  const week = gestationalAge(lmp, on).totalDays / 7;
  let best = 1;
  let bestGap = Infinity;
  ANC_CONTACT_WEEKS.forEach((w, index) => {
    const gap = Math.abs(w - week);
    if (gap < bestGap) {
      bestGap = gap;
      best = index + 1;
    }
  });
  return best;
}

/** A visit is overdue when its due day is before today and it has not been attended. */
export function isOverdue(dueDate: Date, attendedAt: Date | null, today: Date): boolean {
  return (
    attendedAt === null &&
    startOfUtcDay(dueDate).getTime() < startOfUtcDay(today).getTime()
  );
}
