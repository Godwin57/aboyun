import { z } from "zod";
import { SYMPTOM_SIGNS } from "@/lib/symptoms";

// The wire format shared by the phone (lib/offline/sync.ts) and the server
// (app/api/sync/push). Every body is validated with these schemas.

const uuid = z.string().uuid();
const isoDateTime = z.string().datetime({ offset: true });

export const signsSchema = z.object(
  Object.fromEntries(SYMPTOM_SIGNS.map((s) => [s, z.boolean()])) as Record<
    (typeof SYMPTOM_SIGNS)[number],
    z.ZodBoolean
  >,
);

export const symptomOpSchema = z.object({
  type: z.literal("symptom"),
  id: uuid,
  createdAt: isoDateTime,
  signs: signsSchema,
});

export const tabletOpSchema = z.object({
  type: z.literal("tablet"),
  id: uuid,
  createdAt: isoDateTime,
  /** The calendar day on her phone, "YYYY-MM-DD". */
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const emergencyOpSchema = z.object({
  type: z.literal("emergency"),
  id: uuid,
  createdAt: isoDateTime,
  kind: z.enum(["BLEEDING", "LABOUR", "FITS", "BABY", "OTHER"]),
});

export const syncOpSchema = z.discriminatedUnion("type", [
  symptomOpSchema,
  tabletOpSchema,
  emergencyOpSchema,
]);
export type SyncOp = z.infer<typeof syncOpSchema>;

export const pushBodySchema = z.object({ ops: z.array(z.unknown()).max(100) });

export type PushResult = {
  id: string;
  /** "ok": saved (or already saved). "invalid": will never succeed, drop it. "retry": try later. */
  status: "ok" | "invalid" | "retry";
  error?: string;
};

export type PullResponse = {
  cursor: string;
  mother: {
    id: string;
    name: string;
    status: "PREGNANT" | "POSTNATAL";
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    language: string;
    lmp: string;
    edd: string;
  };
  facility: { name: string; phone: string };
  flags: { open: number; highest: "LOW" | "MEDIUM" | "HIGH" | null };
  visits: {
    id: string;
    kind: "ANC" | "PNC";
    dueDate: string;
    attendedAt: string | null;
    contactNo: number | null;
    gestationWeek: number | null;
    updatedAt: string;
  }[];
  reminders: {
    id: string;
    kind: "VISIT" | "TABLET" | "VACCINE";
    dueAt: string;
    status: "PENDING" | "SENT" | "CONFIRMED" | "MISSED";
    updatedAt: string;
  }[];
  reports: {
    id: string;
    source: "APP" | "USSD" | "SMS";
    signs: Record<string, boolean>;
    result: "OK" | "CLINIC_SOON" | "GO_NOW";
    createdAt: string;
    updatedAt: string;
  }[];
};
