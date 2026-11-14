// Reminders: sending due reminders by SMS and confirming them from a reply.
// TODO(track C): sendDueReminders for /api/cron/reminders, marking missed ones, etc.

/**
 * A mother replied "1" to a reminder SMS: mark her most recent SENT reminder CONFIRMED.
 * The inbound SMS route calls this with the sender's phone number (E.164).
 * Returns whether anything was confirmed.
 *
 * Contract: do not change this signature. Track C replaces the body.
 */
export async function confirmLatestReminderByPhone(
  phone: string,
): Promise<{ confirmed: boolean }> {
  void phone;
  return { confirmed: false };
}
