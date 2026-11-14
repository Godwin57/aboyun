"use server";

import { revalidatePath } from "next/cache";
import { getAppSession } from "@/lib/auth";
import {
  recordVisitSchema,
  referMotherSchema,
  resolveFlagSchema,
} from "@/lib/clinic-validation";
import { can } from "@/lib/rbac";
import { z } from "zod";
import { ServiceError } from "@/lib/services/errors";
import { resendMotherInvite } from "@/lib/services/mother-invites";
import { recordVisit, referMother, resolveFlag } from "@/lib/services/visits";

const DENIED = "You don't have permission to do that.";
const GENERIC = "Something went wrong. Please try again.";

function refresh(motherId: string) {
  revalidatePath("/clinic");
  revalidatePath("/clinic/mothers");
  revalidatePath(`/clinic/mothers/${motherId}`);
}

export type RecordVisitResult =
  | { ok: true; refer: boolean; level: "LOW" | "MEDIUM" | "HIGH" }
  | { ok: false; error: string };

export async function recordVisitAction(input: unknown): Promise<RecordVisitResult> {
  const session = await getAppSession();
  if (!session || !can(session, "visit:record")) return { ok: false, error: DENIED };

  const parsed = recordVisitSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check the form and try again.",
    };
  }

  try {
    const result = await recordVisit(session, parsed.data);
    refresh(parsed.data.motherId);
    return { ok: true, refer: result.assessment.refer, level: result.riskLevel };
  } catch (error) {
    if (error instanceof ServiceError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: GENERIC };
  }
}

export type ReferResult =
  { ok: true; toFacilityName: string } | { ok: false; error: string };

export async function referMotherAction(input: unknown): Promise<ReferResult> {
  const session = await getAppSession();
  if (!session || !can(session, "visit:record")) return { ok: false, error: DENIED };

  const parsed = referMotherSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the form and try again." };

  try {
    const result = await referMother(session, parsed.data);
    refresh(parsed.data.motherId);
    return { ok: true, toFacilityName: result.toFacilityName };
  } catch (error) {
    if (error instanceof ServiceError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: GENERIC };
  }
}

export type ResendInviteResult =
  { ok: true; via: "email" | "sms" } | { ok: false; error: string };

export async function resendMotherInviteAction(
  input: unknown,
): Promise<ResendInviteResult> {
  const session = await getAppSession();
  if (!session || !can(session, "mother:update")) return { ok: false, error: DENIED };

  const parsed = z.object({ motherId: z.string().min(1).max(64) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the form and try again." };

  try {
    const result = await resendMotherInvite(session, parsed.data.motherId);
    refresh(parsed.data.motherId);
    return { ok: true, via: result.via };
  } catch (error) {
    if (error instanceof ServiceError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: GENERIC };
  }
}

export type ResolveResult = { ok: true } | { ok: false; error: string };

export async function resolveFlagAction(
  input: unknown,
  motherId: string,
): Promise<ResolveResult> {
  const session = await getAppSession();
  if (!session || !can(session, "visit:record")) return { ok: false, error: DENIED };

  const parsed = resolveFlagSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the form and try again." };

  try {
    await resolveFlag(session, parsed.data);
    refresh(motherId);
    return { ok: true };
  } catch (error) {
    if (error instanceof ServiceError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: GENERIC };
  }
}
