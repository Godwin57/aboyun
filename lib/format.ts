// Date formatting for calendar days stored as UTC midnight. Always format in UTC so a
// due date never shifts by a day depending on where the server or browser runs.

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
});
const dayYearFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const shortFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
});
const weekdayFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "short",
});
const dayNumberFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
});

/** "Fri 4 Dec" */
export const formatDay = (d: Date) => dayFormat.format(d).replace(",", "");
/** "Fri 4 Dec 2026" */
export const formatDayYear = (d: Date) => dayYearFormat.format(d).replace(",", "");
/** "4 Dec" */
export const formatShort = (d: Date) => shortFormat.format(d);
export const formatWeekday = (d: Date) => weekdayFormat.format(d);
export const formatDayNumber = (d: Date) => dayNumberFormat.format(d);

/** "today", "yesterday" or "5 days ago", counted in whole days. */
export function relativeDays(date: Date, now: Date = new Date()): string {
  const days = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

/** "5 minutes ago", "2 hours ago" or "3 days ago", for timestamps. */
export function timeAgo(date: Date, now: Date = new Date()): string {
  const minutes = Math.max(0, Math.round((now.getTime() - date.getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
