import { db } from "@/lib/db";
import { placeholderEmailFor } from "@/lib/phone";
import { requirePermission, scopeWhere, type AppSession } from "@/lib/rbac";
import { logAudit } from "./audit";
import { ServiceError } from "./errors";
import { sendInvite } from "./invites";

const RESEND_MINUTES = 5;

/** Has this mother set a password yet? Pure helper for the record page too. */
export async function motherHasPassword(userId: string | null): Promise<boolean> {
  if (!userId) return false;
  const account = await db.account.findFirst({
    where: { userId, providerId: "credential" },
    select: { id: true },
  });
  return account !== null;
}

/**
 * CLINIC: send a new set-password link to a mother of the clinic's facility who has not
 * set a password yet. One send per 5 minutes per mother.
 */
export async function resendMotherInvite(session: AppSession, motherId: string) {
  requirePermission(session, "mother:update");

  const mother = await db.mother.findFirst({
    // AND, so the session's scope always applies whatever id is asked for.
    where: { AND: [scopeWhere(session), { id: motherId }] },
    select: { id: true, userId: true, phone: true, email: true },
  });
  if (!mother || !mother.userId) throw new ServiceError("Mother not found.");

  const user = await db.user.findUnique({
    where: { id: mother.userId },
    select: { id: true, email: true },
  });
  if (!user) throw new ServiceError("This mother has no login to send a link to.");

  if (await motherHasPassword(user.id)) {
    throw new ServiceError("She has already set her password.");
  }

  const loginEmail =
    mother.email?.toLowerCase() ??
    (mother.phone ? placeholderEmailFor(mother.phone) : null);
  if (!loginEmail) throw new ServiceError("She has no phone number or email on record.");

  const since = new Date(Date.now() - RESEND_MINUTES * 60_000);
  const recent = await db.auditLog.findFirst({
    where: {
      action: "invite.send",
      entity: "User",
      entityId: user.id,
      at: { gte: since },
    },
    select: { id: true },
  });
  if (recent) {
    throw new ServiceError(
      `A link was sent a moment ago. Please wait ${RESEND_MINUTES} minutes before sending another.`,
    );
  }

  // Better Auth looks the user up by this address; it must be the one she signed up with.
  await sendInvite(user.email ?? loginEmail);

  await logAudit({
    actorId: session.user.id,
    action: "invite.send",
    entity: "User",
    entityId: user.id,
  });

  return { via: mother.email ? ("email" as const) : ("sms" as const) };
}
