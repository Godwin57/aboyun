import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { buttonVariants } from "@/components/ui/button";
import { findInvite } from "@/lib/services/invites";
import { AcceptInviteForm } from "./accept-invite-form";

export const metadata: Metadata = { title: "Set your password" };

// Better Auth redirects here as /accept-invite?token=... (or ?error=INVALID_TOKEN).
// Used for every invited person: clinic contacts and mothers.
export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token } = await searchParams;
  const [t, invitee] = await Promise.all([
    getTranslations("Auth.invite"),
    findInvite(token),
  ]);

  if (!token || !invitee || !invitee.active) {
    return (
      <AuthShell>
        <div className="space-y-4">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {t("expiredTitle")}
          </h1>
          <p className="text-muted-foreground">{t("expiredBody")}</p>
          <Link
            href="/login"
            className={buttonVariants({ className: "h-12 w-full text-base" })}
          >
            {t("goToSignIn")}
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {t("welcome", { name: invitee.name })}
          </h1>
          <p className="text-muted-foreground">{t("choose", { email: invitee.email })}</p>
        </div>
        <AcceptInviteForm token={token} />
      </div>
    </AuthShell>
  );
}
