"use server";

import { getAppSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { logAudit } from "@/lib/services/audit";
import { sendInvite } from "@/lib/services/invites";

export type ResendInviteResult = { ok: true; email: string } | { ok: false; error: string };

/** SYSTEM_ADMIN only: email a fresh set-password link to a clinic contact who has not joined yet. */
export async function resendInviteAction(userId: string): Promise<ResendInviteResult> {
  const session = await getAppSession();
  if (!session || !can(session, "facility:manage")) {
    return { ok: false, error: "You don't have permission to do that." };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      accounts: { where: { providerId: "credential" }, select: { id: true } },
    },
  });
  if (!user || user.role !== "CLINIC") {
    return { ok: false, error: "That clinic contact was not found." };
  }
  if (user.accounts.length > 0) {
    return { ok: false, error: "This person has already set a password." };
  }

  try {
    await sendInvite(user.email);
    await logAudit({
      actorId: session.user.id,
      action: "invite.resend",
      entity: "User",
      entityId: user.id,
    });
    return { ok: true, email: user.email };
  } catch (error) {
    console.error(error);
    return { ok: false, error: "We couldn't send the invite. Try again." };
  }
}
