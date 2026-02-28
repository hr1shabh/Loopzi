"use client";

import { useServiceWorker } from "@/hooks/use-service-worker";

/**
 * Client component that registers the service worker.
 * Rendered once in the root layout — no visible UI.
 */
export function ServiceWorkerRegistrar() {
    useServiceWorker();
    return null;
}
