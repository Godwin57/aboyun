"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resendInviteAction } from "./actions";

export function ResendInviteButton({ userId }: { userId: string }) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const result = await resendInviteAction(userId);
      if (result.ok) toast.success(`Invite sent to ${result.email}`);
      else toast.error(result.error);
    });
  }

  return (
    <Button variant="outline" className="h-11" onClick={onClick} disabled={pending}>
      {pending ? "Sending…" : "Resend invite"}
    </Button>
  );
}
