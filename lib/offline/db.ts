import Dexie, { type Table } from "dexie";
import type { PullResponse, SyncOp } from "@/lib/offline/protocol";
import type { SymptomResult } from "@/lib/symptoms";

// IndexedDB on the phone. Every write lands here first, plus a row in `outbox`, so the
// screen updates at once. `synced` is 0 (only on this phone), 1 (on the server) or
// 2 (the server refused it; shown as saved on this device only).

export type SyncFlag = 0 | 1 | 2;

export type LocalReport = {
  id: string;
  createdAt: string;
  signs: Record<string, boolean>;
  result: SymptomResult;
  source: "APP" | "USSD" | "SMS";
  synced: SyncFlag;
};

/** One row per day, keyed by the calendar day on her phone ("YYYY-MM-DD"). */
export type LocalTablet = {
  day: string;
  id: string;
  createdAt: string;
  synced: SyncFlag;
};

export type LocalEmergency = {
  id: string;
  kind: "BLEEDING" | "LABOUR" | "FITS" | "BABY" | "OTHER";
  createdAt: string;
  synced: SyncFlag;
};

export type OutboxItem = {
  /** Same as the id of the record it creates. */
  id: string;
  op: SyncOp;
  createdAt: string;
  attempts: number;
};

export type MetaRow = { key: string; value: unknown };

export type HomeSnapshot = Pick<PullResponse, "mother" | "facility" | "flags">;

class AboyunDB extends Dexie {
  meta!: Table<MetaRow, string>;
  visits!: Table<PullResponse["visits"][number], string>;
  reminders!: Table<PullResponse["reminders"][number], string>;
  reports!: Table<LocalReport, string>;
  tablets!: Table<LocalTablet, string>;
  emergencies!: Table<LocalEmergency, string>;
  outbox!: Table<OutboxItem, string>;

  constructor() {
    super("aboyun");
    this.version(1).stores({
      meta: "key",
      visits: "id, dueDate",
      reminders: "id, dueAt",
      reports: "id, createdAt",
      tablets: "day",
      emergencies: "id, createdAt",
      outbox: "id, createdAt",
    });
  }
}

let instance: AboyunDB | null = null;

/** The database. Browser only: call it from effects, handlers and live queries. */
export function getDb(): AboyunDB {
  instance ??= new AboyunDB();
  return instance;
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const row = await getDb().meta.get(key);
  return row?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown) {
  await getDb().meta.put({ key, value });
}

/** New random id for a record made on the phone. The server keeps it as the record id. */
export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  // Old, insecure-context fallback (the id only needs to be unique).
  const hex = (n: number) =>
    Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  return `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(12)}`;
}

/** Her calendar day on this phone, "YYYY-MM-DD". */
export function localDay(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Wipe everything stored for her: used on sign-out and when a different person signs in. */
export async function clearAllLocalData() {
  try {
    await getDb().delete();
    instance = null;
  } catch {
    // Nothing to clear (or IndexedDB is blocked).
  }
  if (typeof caches !== "undefined") {
    try {
      const keys = await caches.keys();
      // Keep the precached app shell; drop pages and data that belong to her.
      await Promise.all(
        keys.filter((k) => !k.includes("precache")).map((k) => caches.delete(k)),
      );
    } catch {
      // ignore
    }
  }
}
