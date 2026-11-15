import {
  clearAllLocalData,
  getDb,
  getMeta,
  setMeta,
  type SyncFlag,
} from "@/lib/offline/db";
import type { PullResponse, PushResult } from "@/lib/offline/protocol";

/** If she has not synced for this long, she must sign in again. */
export const MAX_OFFLINE_DAYS = 7;
const DAY_MS = 86_400_000;
const BATCH = 25;

export type SyncState = {
  syncing: boolean;
  /** Writes that are only on this phone. */
  pending: number;
  /** ISO time of the last complete sync, if any. */
  lastSync: string | null;
  /** The server said she is no longer signed in, or she was offline too long. */
  signInRequired: boolean;
  online: boolean;
};

let state: SyncState = {
  syncing: false,
  pending: 0,
  lastSync: null,
  signInRequired: false,
  online: true,
};
const listeners = new Set<() => void>();

function setState(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function subscribeSync(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function getSyncState() {
  return state;
}
const SERVER_STATE: SyncState = { ...state };
export function getServerSyncState() {
  return SERVER_STATE;
}

export async function refreshPending() {
  try {
    setState({ pending: await getDb().outbox.count() });
  } catch {
    // IndexedDB blocked: nothing to show.
  }
}

/** True when the last sync is older than the limit: she must sign in again. */
export async function isSessionStale(now = Date.now()): Promise<boolean> {
  const last = await getMeta<string>("lastSync");
  if (!last) return false; // never synced: nothing to expire; the server decides
  return now - new Date(last).getTime() > MAX_OFFLINE_DAYS * DAY_MS;
}

let inFlight: Promise<void> | null = null;
let again = false;

/**
 * Push then pull. Two calls at once share one run, so syncs never overlap. A call made
 * while a run is going triggers one more run afterwards, so a new write is never missed.
 */
export function syncNow(): Promise<void> {
  if (inFlight) {
    again = true;
    return inFlight;
  }
  inFlight = (async () => {
    try {
      do {
        again = false;
        await run();
      } while (again);
    } finally {
      inFlight = null;
      setState({ syncing: false });
    }
  })();
  return inFlight;
}

async function markRecord(id: string, type: string, synced: SyncFlag) {
  const db = getDb();
  if (type === "symptom") await db.reports.update(id, { synced });
  else if (type === "emergency") await db.emergencies.update(id, { synced });
  else if (type === "tablet") await db.tablets.where("id").equals(id).modify({ synced });
}

async function run() {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    setState({ online: false });
    await refreshPending();
    return;
  }
  setState({ syncing: true, online: true });
  const db = getDb();

  // The server forgets sessions too: a phone that was away for 7 days signs in again.
  if (await isSessionStale()) {
    setState({ signInRequired: true });
    return;
  }

  try {
    // 1) Push, oldest first, a batch at a time.
    for (;;) {
      const items = await db.outbox.orderBy("createdAt").limit(BATCH).toArray();
      if (items.length === 0) break;
      const res = await fetch("/api/sync/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ops: items.map((i) => i.op) }),
      });
      if (res.status === 401 || res.status === 403) {
        setState({ signInRequired: true });
        return;
      }
      if (!res.ok) throw new Error(`push ${res.status}`);
      const { results } = (await res.json()) as { results: PushResult[] };
      const byId = new Map(results.map((r) => [r.id, r]));
      let progressed = false;
      for (const item of items) {
        const r = byId.get(item.id);
        if (r?.status === "ok") {
          await db.outbox.delete(item.id);
          await markRecord(item.id, item.op.type, 1);
          progressed = true;
        } else if (r?.status === "invalid") {
          await db.outbox.delete(item.id);
          await markRecord(item.id, item.op.type, 2);
          progressed = true;
        } else {
          await db.outbox.update(item.id, { attempts: item.attempts + 1 });
        }
      }
      await refreshPending();
      if (!progressed) throw new Error("server could not save the outbox yet");
    }

    // 2) Pull what changed on the server since the last cursor.
    const cursor = await getMeta<string>("cursor");
    const url = cursor
      ? `/api/sync/pull?since=${encodeURIComponent(cursor)}`
      : "/api/sync/pull";
    const res = await fetch(url, { cache: "no-store" });
    if (res.status === 401 || res.status === 403) {
      setState({ signInRequired: true });
      return;
    }
    if (!res.ok) throw new Error(`pull ${res.status}`);
    await applyPull((await res.json()) as PullResponse);

    const now = new Date().toISOString();
    await setMeta("lastSync", now);
    setState({ lastSync: now, signInRequired: false });
  } catch (error) {
    // Offline or the server is busy: the outbox is kept and tried again later.
    console.warn("Sync did not finish", error);
  } finally {
    await refreshPending();
  }
}

async function applyPull(data: PullResponse) {
  const db = getDb();
  await db.transaction(
    "rw",
    [db.meta, db.visits, db.reminders, db.reports, db.tablets],
    async () => {
      await db.meta.put({
        key: "home",
        value: { mother: data.mother, facility: data.facility, flags: data.flags },
      });
      await db.visits.bulkPut(data.visits);
      await db.reminders.bulkPut(data.reminders);

      for (const r of data.reports) {
        await db.reports.put({
          id: r.id,
          createdAt: r.createdAt,
          signs: r.signs,
          result: r.result,
          source: r.source,
          synced: 1,
        });
      }
      // Tablet days already confirmed on the server (SMS reply, another phone).
      for (const r of data.reminders) {
        if (r.kind !== "TABLET" || r.status !== "CONFIRMED") continue;
        const day = r.dueAt.slice(0, 10);
        const have = await db.tablets.get(day);
        if (!have) {
          await db.tablets.put({ day, id: r.id, createdAt: r.updatedAt, synced: 1 });
        }
      }
      await db.meta.put({ key: "cursor", value: data.cursor });
    },
  );
}

/**
 * Call once when the mother app opens. Makes sure the data on the phone belongs to this
 * person, wires up the `online` event, and runs a first sync.
 */
export function startSync(userId: string): () => void {
  let stopped = false;

  async function boot() {
    try {
      const owner = await getMeta<string>("userId");
      if (owner && owner !== userId) await clearAllLocalData();
      await setMeta("userId", userId);
      const last = (await getMeta<string>("lastSync")) ?? null;
      if (!stopped) setState({ lastSync: last });
    } catch {
      // IndexedDB blocked (private mode): the app still works online.
    }
    await refreshPending();
    if (await isSessionStale()) {
      // Offline for more than 7 days: she must sign in again before using her records.
      if (!stopped) setState({ signInRequired: true });
      return;
    }
    if (!stopped) void syncNow();
  }

  const onOnline = () => {
    setState({ online: true });
    void syncNow();
  };
  const onOffline = () => setState({ online: false });
  const onVisible = () => {
    if (document.visibilityState === "visible") void syncNow();
  };

  setState({ online: navigator.onLine });
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  document.addEventListener("visibilitychange", onVisible);
  void boot();

  return () => {
    stopped = true;
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
