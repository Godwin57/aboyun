"use client";

import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { clearAllLocalData } from "@/lib/offline/db";

/** Signs out, then wipes IndexedDB and cached pages so the next person sees nothing of hers. */
export async function signOutAndClear() {
  try {
    await authClient.signOut();
  } catch {
    // Offline: the data on this phone is still cleared below.
  }
  await clearAllLocalData();
}

export function SignOutButton({ className }: { className?: string }) {
  const t = useTranslations("Common");
  const router = useRouter();

  async function onSignOut() {
    await signOutAndClear();
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
