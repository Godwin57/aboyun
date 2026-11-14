"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { emergencyAction } from "@/app/(roles)/clinic/emergencies/actions";

type Status = "OPEN" | "ACKNOWLEDGED" | "REFERRED" | "CLOSED";
type Op = "acknowledge" | "refer" | "close";

/** The buttons a nurse can press on one emergency, depending on where it is up to. */
export function EmergencyActions({ id, status }: { id: string; status: Status }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(op: Op) {
    startTransition(async () => {
      const result = await emergencyAction({ id, op });
      if (!result.ok) {
        toast.error(result.error);
        // The list may be out of date (someone else handled it): show the current state.
        router.refresh();
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  if (status === "CLOSED") return null;

  return (
    <div className="flex flex-wrap gap-2.5">
      {status === "OPEN" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run("acknowledge")}
          className="btn-gradient min-h-12 cursor-pointer rounded-xl px-5 font-semibold disabled:opacity-70"
        >
          Acknowledge
        </button>
      )}
      {(status === "OPEN" || status === "ACKNOWLEDGED") && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run("refer")}
          className="btn-danger min-h-12 cursor-pointer rounded-xl px-5 font-semibold disabled:opacity-70"
        >
          Refer to hospital
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => run("close")}
        className="neu-raised min-h-12 cursor-pointer rounded-xl px-5 font-medium disabled:opacity-70"
      >
        Close
      </button>
    </div>
  );
}
