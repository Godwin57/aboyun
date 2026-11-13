"use server";

import { revalidatePath } from "next/cache";
import { getAppSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { ClinicError, createClinic } from "@/lib/services/clinics";
import { createClinicSchema, type CreateClinicInput } from "@/lib/validation";

export type CreateClinicResult =
  | { ok: true; clinicName: string; email: string; inviteSent: boolean }
  | { ok: false; error: string };

export async function createClinicAction(
  input: CreateClinicInput,
): Promise<CreateClinicResult> {
  // Never trust the UI: re-check the session and permission on the server.
  const session = await getAppSession();
  if (!session || !can(session, "facility:manage")) {
    return { ok: false, error: "You don't have permission to do that." };
  }

  const parsed = createClinicSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check the form and try again.",
    };
  }

  try {
    const { facility, user, inviteSent } = await createClinic(session, parsed.data);
    revalidatePath("/admin");
    return { ok: true, clinicName: facility.name, email: user.email, inviteSent };
  } catch (error) {
    if (error instanceof ClinicError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
