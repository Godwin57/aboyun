"use client";

import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SignOutButton({ className }: { className?: string }) {
  const t = useTranslations("Common");
  const router = useRouter();

  async function onSignOut() {
    await authClient.signOut();
    // TODO(offline): also clear IndexedDB (Dexie) and cached API responses here.
    router.replace("/login");
    router.refresh();
  }

  return (
    <Button variant="ghost" onClick={onSignOut} className={className}>
      <LogOut className="size-4" />
      {t("signOut")}
    </Button>
  );
}
