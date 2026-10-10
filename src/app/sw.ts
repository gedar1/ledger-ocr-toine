import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

// This declares the value of `injectionPoint` to TypeScript. `injectionPoint`
// is the string that will be replaced by the actual precache manifest.
// By default, this string is set to `"self.__SW_MANIFEST"`.
// See node_modules/@serwist/next/dist/sw-entry.d.mts and
// https://serwist.pages.dev/docs/next/getting-started.
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: [
    ...(self.__SW_MANIFEST ?? []),
    // Explicitly precached so the offline fallback below is always
    // available even if /offline wasn't visited before going offline.
    { url: "/offline", revision: null },
  ],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
