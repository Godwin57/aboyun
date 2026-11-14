"use client";

import { useSyncExternalStore } from "react";
import { getServerSyncState, getSyncState, subscribeSync } from "@/lib/offline/sync";

/** Live sync status: online, syncing, how many writes are waiting, last sync time. */
export function useSyncState() {
  return useSyncExternalStore(subscribeSync, getSyncState, getServerSyncState);
}
