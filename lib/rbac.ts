import type { Role } from "@/lib/generated/prisma/enums";

export type Permission =
  | "mother:read"
  | "mother:create"
  | "mother:update"
  | "visit:record"
  | "symptom:report"
  | "tablet:confirm"
  | "emergency:trigger"
  | "emergency:handle"
  | "sms:bulk"
  | "user:manage"
  | "report:view"
  | "audit:view"
  | "facility:manage";

/** The slice of the session that RBAC needs. */
export type AppSession = {
  user: {
    id: string;
    role: Role;
    /** CLINIC users: the facility they belong to. */
    facilityId?: string | null;
    /** MOTHER users: the Mother record linked to this login. */
    motherId?: string | null;
  };
};

export const PERMISSIONS: Record<Role, readonly Permission[]> = {
  MOTHER: [
    "mother:read",
    "mother:create",
    "mother:update",
    "symptom:report",
    "tablet:confirm",
    "emergency:trigger",
  ],
  CLINIC: [
    "mother:read",
    "mother:create",
    "mother:update",
    "visit:record",
    "symptom:report",
    "emergency:trigger",
    "emergency:handle",
    "sms:bulk",
    "user:manage",
    "report:view",
    "audit:view",
  ],
  // Everything except the mother-facing actions, plus facility management.
  SYSTEM_ADMIN: [
    "mother:read",
    "mother:create",
    "mother:update",
    "visit:record",
    "emergency:handle",
    "sms:bulk",
    "user:manage",
    "report:view",
    "audit:view",
    "facility:manage",
  ],
};

/** Where each role lands after sign-in. */
export const ROLE_HOME: Record<Role, string> = {
  MOTHER: "/mother",
  CLINIC: "/clinic",
  SYSTEM_ADMIN: "/admin",
};

export function roleHome(role: Role): string {
  return ROLE_HOME[role];
}

export function can(
  session: AppSession | null | undefined,
  permission: Permission,
): boolean {
  if (!session) return false;
  return PERMISSIONS[session.user.role]?.includes(permission) ?? false;
}

export class ForbiddenError extends Error {
  constructor(permission: Permission) {
    super(`Forbidden: missing permission "${permission}"`);
    this.name = "ForbiddenError";
  }
}

/** Throws ForbiddenError unless the session holds the permission. */
export function requirePermission(
  session: AppSession | null | undefined,
  permission: Permission,
): asserts session is AppSession {
  if (!can(session, permission)) throw new ForbiddenError(permission);
}

/** Matches no row. Used when a scoped user is missing the id they are scoped by. */
const NO_MATCH = "00000000-0000-0000-0000-000000000000";

/**
 * Prisma `where` for tables that belong to a mother (visits, flags, referrals,
 * reminders...): restrict them to mothers the session may see.
 */
export function motherChildScope(session: AppSession) {
  return { mother: scopeWhere(session) };
}

/**
 * Prisma `where` for Mother (patient) data the session may see:
 * MOTHER -> her own record, CLINIC -> mothers of their facility, SYSTEM_ADMIN -> all.
 */
export function scopeWhere(session: AppSession): {
  id?: string;
  facilityId?: string;
} {
  switch (session.user.role) {
    case "MOTHER":
      return { id: session.user.motherId ?? NO_MATCH };
    case "CLINIC":
      return { facilityId: session.user.facilityId ?? NO_MATCH };
    case "SYSTEM_ADMIN":
      return {};
  }
}
