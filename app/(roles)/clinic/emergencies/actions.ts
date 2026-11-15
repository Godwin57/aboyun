"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAppSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import {
  acknowledgeEmergency,
  closeEmergency,
  referEmergency,
} from "@/lib/services/emergency";
import { ServiceError } from "@/lib/services/errors";

const schema = z.object({
  id: z.uuid(),
  op: z.enum(["acknowledge", "refer", "close"]),
});

export type EmergencyActionResult =
  { ok: true; message: string } | { ok: false; error: string };

export async function emergencyAction(input: unknown): Promise<EmergencyActionResult> {
  // Never trust the UI: re-check the session and permission on the server.
  const session = await getAppSession();
  if (!session || !can(session, "emergency:handle")) {
    return { ok: false, error: "You don't have permission to do that." };
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Something went wrong. Please try again." };
  const { id, op } = parsed.data;

  try {
    let message: string;
    if (op === "acknowledge") {
      await acknowledgeEmergency(session, id);
      message = "Acknowledged. The mother's family can see someone is on it.";
    } else if (op === "refer") {
      const { toFacilityName } = await referEmergency(session, id);
      message = `Referred to ${toFacilityName}. She and the facility have been texted.`;
    } else {
      await closeEmergency(session, id);
      message = "Emergency closed.";
    }
    revalidatePath("/clinic");
    revalidatePath("/clinic/emergencies");
    return { ok: true, message };
  } catch (error) {
    if (error instanceof ServiceError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
