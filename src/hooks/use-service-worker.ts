"use client";

import { useEffect } from "react";

/**
 * Registers the service worker for PWA functionality.
 * Only runs in production or when explicitly enabled.
 */
export function useServiceWorker() {
    useEffect(() => {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker
                .register("/sw.js")
                .then((registration) => {
                    console.log("SW registered:", registration.scope);
                })
                .catch((error) => {
                    console.error("SW registration failed:", error);
                });
        }
    }, []);
}
