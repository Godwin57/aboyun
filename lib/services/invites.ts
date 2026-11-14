import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { takeInviteFailure } from "@/lib/invite-email";
import { ServiceError } from "./errors";

/**
 * Email (or SMS, for phone-only mothers) a set-password link to an existing user.
 * It is a Better Auth single-use token valid for 7 days; the link lands on /accept-invite.
 * Used for clinic contacts now, and for mothers when a clinic registers them.
 */
export async function sendInvite(email: string) {
  await auth.api.requestPasswordReset({
    body: { email, redirectTo: "/accept-invite" },
  });
  // Better Auth hides send errors, so check whether the message really went out.
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (user && takeInviteFailure(user.id)) {
    throw new ServiceError("The link could not be sent. Please try again in a moment.");
  }
}

/** Look up an invite token without consuming it. Returns the invited user, or null. */
export async function findInvite(token: string | undefined) {
  if (!token) return null;
  const ctx = await auth.$context;
  const record = await ctx.internalAdapter.findVerificationValue(
    `reset-password:${token}`,
  );
  if (!record || record.expiresAt < new Date()) return null;
  return db.user.findUnique({
    where: { id: record.value },
    select: { id: true, email: true, name: true, role: true, active: true },
  });
}
