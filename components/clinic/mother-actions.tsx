"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  referMotherAction,
  resolveFlagAction,
} from "@/app/(roles)/clinic/mothers/[id]/actions";

/** "Mark as referred": sends her to the default referral facility and links the open flags. */
export function ReferButton({ motherId }: { motherId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await referMotherAction({ motherId });
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success(`Referred to ${result.toFacilityName}`);
          router.refresh();
        })
      }
      className="btn-danger min-h-12 cursor-pointer rounded-xl px-5 font-semibold disabled:opacity-70"
    >
      {pending ? "Saving…" : "Mark as referred"}
    </button>
  );
}

/** Closes a risk flag (for example after the doctor has seen her). */
export function ResolveFlagButton({
  flagId,
  motherId,
}: {
  flagId: string;
  motherId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await resolveFlagAction({ flagId }, motherId);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success("Flag closed");
          router.refresh();
        })
      }
      className="neu-raised min-h-11 cursor-pointer rounded-xl px-3.5 text-sm font-medium disabled:opacity-70"
    >
      {pending ? "Closing…" : "Close flag"}
    </button>
  );
}
