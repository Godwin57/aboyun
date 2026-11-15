import { defaultCache } from "@serwist/turbopack/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { NetworkFirst, NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const OFFLINE_URL = "/~offline";

// Order matters: the first matching rule wins, so ours go before defaultCache.
const runtimeCaching: RuntimeCaching[] = [
  // Sync calls must always reach the server. A cached answer would look like "synced".
  {
    matcher: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith("/api/sync/"),
    handler: new NetworkOnly(),
  },
  // The mother app is one page. Try the network briefly, then open the last copy, so it
  // opens on a weak or missing connection. Her data comes from IndexedDB, not this page.
  {
    matcher: ({ request, sameOrigin, url }) =>
      sameOrigin &&
      request.mode === "navigate" &&
      (url.pathname === "/mother" || url.pathname.startsWith("/mother/")),
    handler: new NetworkFirst({ cacheName: "mother-pages", networkTimeoutSeconds: 3 }),
  },
  ...defaultCache,
];

const serwist = new Serwist({
  precacheEntries: [
    ...(self.__SW_MANIFEST ?? []),
    // Shown when a page is not cached and there is no connection.
    { url: OFFLINE_URL, revision: "1" },
  ],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: OFFLINE_URL,
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();
