import { db } from "@/lib/db";
import type { ActorType } from "@/lib/generated/prisma/enums";

/** Append a row to the audit log. Never update or delete audit rows. */
export async function logAudit(entry: {
  actorId?: string | null;
  actorType?: ActorType;
  action: string;
  entity: string;
  entityId: string;
}) {
  await db.auditLog.create({
    data: {
      actorId: entry.actorId ?? null,
      actorType: entry.actorType ?? "USER",
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
    },
  });
}
