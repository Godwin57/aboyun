import { getDb, localDay, newId } from "@/lib/offline/db";
import type { LocalEmergency } from "@/lib/offline/db";
import { refreshPending, syncNow } from "@/lib/offline/sync";
import { assessSymptoms, SYMPTOM_SIGNS, type SymptomSign } from "@/lib/symptoms";

// Every write the mother makes. Each one is saved on the phone and queued in the outbox
// in one transaction, then a sync is tried straight away (it does nothing when offline).

export async function saveSymptomCheck(answers: Partial<Record<SymptomSign, boolean>>) {
  const db = getDb();
  const signs = Object.fromEntries(
    SYMPTOM_SIGNS.map((s) => [s, answers[s] === true]),
  ) as Record<SymptomSign, boolean>;
  const result = assessSymptoms(signs);
  const id = newId();
  const createdAt = new Date().toISOString();
  await db.transaction("rw", [db.reports, db.outbox], async () => {
    await db.reports.put({ id, createdAt, signs, result, source: "APP", synced: 0 });
    await db.outbox.put({
      id,
      createdAt,
      attempts: 0,
      op: { type: "symptom", id, createdAt, signs },
    });
  });
  await refreshPending();
  void syncNow();
  return { id, result };
}

/** Marks today's tablet as taken. Doing it twice on one day changes nothing. */
export async function confirmTabletToday() {
  const db = getDb();
  const day = localDay();
  const id = newId();
  const createdAt = new Date().toISOString();
  const added = await db.transaction("rw", [db.tablets, db.outbox], async () => {
    if (await db.tablets.get(day)) return false;
    await db.tablets.put({ day, id, createdAt, synced: 0 });
    await db.outbox.put({
      id,
      createdAt,
      attempts: 0,
      op: { type: "tablet", id, createdAt, day },
    });
    return true;
  });
  await refreshPending();
  if (added) void syncNow();
  return added;
}

export async function raiseEmergencyLocal(kind: LocalEmergency["kind"]) {
  const db = getDb();
  const id = newId();
  const createdAt = new Date().toISOString();
  await db.transaction("rw", [db.emergencies, db.outbox], async () => {
    await db.emergencies.put({ id, kind, createdAt, synced: 0 });
    await db.outbox.put({
      id,
      createdAt,
      attempts: 0,
      op: { type: "emergency", id, createdAt, kind },
    });
  });
  await refreshPending();
  void syncNow();
  return id;
}
