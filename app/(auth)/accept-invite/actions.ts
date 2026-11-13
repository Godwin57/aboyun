"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { roleHome } from "@/lib/rbac";
import { findInvite } from "@/lib/services/invites";
import { acceptInviteSchema, type AuthErrorKey } from "@/lib/validation";

// Errors are keys; the form translates them into the visitor's language.
export type AcceptInviteState = {
  error?: "invalid" | "failed";
  fieldErrors?: { password?: AuthErrorKey; confirm?: AuthErrorKey };
};

/** Set the password from an invite link, sign the user in, and send them to their home. */
export async function acceptInvite(
  _prev: AcceptInviteState,
  formData: FormData,
): Promise<AcceptInviteState> {
  const parsed = acceptInviteSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    const fieldErrors: NonNullable<AcceptInviteState["fieldErrors"]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "password" || key === "confirm") {
        fieldErrors[key] ??= issue.message as AuthErrorKey;
      }
    }
    return { fieldErrors };
  }

  const { token, password } = parsed.data;
  const invitee = await findInvite(token);
  if (!invitee || !invitee.active) return { error: "invalid" };

  try {
    await auth.api.resetPassword({ body: { token, newPassword: password } });
    await auth.api.signInEmail({ body: { email: invitee.email, password } });
  } catch {
    return { error: "failed" };
  }

  redirect(roleHome(invitee.role));
}
