import { db } from "@/lib/db";
import { normalizeNgPhone } from "@/lib/phone";
import { requirePermission, type AppSession } from "@/lib/rbac";
import { logAudit } from "@/lib/services/audit";
import { sendInvite } from "@/lib/services/invites";
import type { CreateClinicInput } from "@/lib/validation";

export class ClinicError extends Error {}

/**
 * SYSTEM_ADMIN only: register a clinic (facility) and its first login, then email
 * the invite. The clinic user has no password until they accept the invite.
 */
export async function createClinic(session: AppSession, input: CreateClinicInput) {
  requirePermission(session, "facility:manage");

  const email = input.email.toLowerCase();
  const phone = normalizeNgPhone(input.phone);
  if (!phone) throw new ClinicError("Enter a valid Nigerian phone number.");
  if (await db.user.findUnique({ where: { email }, select: { id: true } })) {
    throw new ClinicError("A user with this email already exists.");
  }

  const { facility, user } = await db.$transaction(async (tx) => {
    const area =
      (await tx.area.findFirst({ where: { state: input.state, lga: input.lga } })) ??
      (await tx.area.create({
        data: { name: input.lga, state: input.state, lga: input.lga },
      }));
    const facility = await tx.facility.create({
      data: {
        name: input.name,
        areaId: area.id,
        phone,
        email,
        hasCSection: input.hasCSection,
        hasBlood: input.hasBlood,
      },
    });
    const user = await tx.user.create({
      data: {
        email,
        name: input.contactName,
        role: "CLINIC",
        facilityId: facility.id,
      },
    });
    return { facility, user };
  });

  await logAudit({
    actorId: session.user.id,
    action: "facility.create",
    entity: "Facility",
    entityId: facility.id,
  });

  let inviteSent = true;
  try {
    await sendInvite(email);
    await logAudit({
      actorId: session.user.id,
      action: "invite.send",
      entity: "User",
      entityId: user.id,
    });
  } catch (error) {
    inviteSent = false;
    console.error("Failed to send clinic invite", error);
  }

  return { facility, user, inviteSent };
}
