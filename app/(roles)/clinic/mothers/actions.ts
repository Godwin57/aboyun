"use server";

import { revalidatePath } from "next/cache";
import { getAppSession } from "@/lib/auth";
import { registerMotherSchema } from "@/lib/clinic-validation";
import { can } from "@/lib/rbac";
import { ServiceError } from "@/lib/services/errors";
import { registerMother } from "@/lib/services/mothers";

export type RegisterMotherResult =
  | {
      ok: true;
      motherId: string;
      name: string;
      inviteSent: boolean;
      via: "email" | "sms";
    }
  | {
      ok: false;
      error: string;
      /** Zod issue paths (e.g. ["familyContacts", 0, "phone"]) with their messages. */
      issues?: { path: (string | number)[]; message: string }[];
    };

export async function registerMotherAction(
  input: unknown,
): Promise<RegisterMotherResult> {
  // Never trust the UI: re-check the session and permission on the server.
  const session = await getAppSession();
  if (!session || !can(session, "mother:create")) {
    return { ok: false, error: "You don't have permission to do that." };
  }

  const parsed = registerMotherSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check the form and try again.",
      issues: parsed.error.issues.map((i) => ({
        path: i.path.filter((p): p is string | number => typeof p !== "symbol"),
        message: i.message,
      })),
    };
  }

  try {
    const result = await registerMother(session, parsed.data);
    revalidatePath("/clinic");
    revalidatePath("/clinic/mothers");
    return { ok: true, name: parsed.data.name, ...result };
  } catch (error) {
    if (error instanceof ServiceError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
