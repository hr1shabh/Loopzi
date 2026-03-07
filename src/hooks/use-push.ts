"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Convert a URL-safe base64 VAPID key to a Uint8Array for pushManager.subscribe.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const outputArray = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) {
    outputArray[i] = raw.charCodeAt(i);
  }
  return outputArray;
}

interface UsePushReturn {
  permission: NotificationPermission | "unsupported";
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
}

export function usePush(): UsePushReturn {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "default"
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check initial state
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPermission("unsupported");
      setIsLoading(false);
      return;
    }

    setPermission(Notification.permission);

    // Add a timeout so the switch isn't stuck disabled forever
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 5000);

    navigator.serviceWorker.ready.then((registration) => {
      clearTimeout(timeout);
      registration.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub);
        setIsLoading(false);
      });
    });

    return () => clearTimeout(timeout);
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (permission === "unsupported") return false;
    setIsLoading(true);
    setError(null);

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") {
        setError("Notification permission denied");
        setIsLoading(false);
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        setError("VAPID key not configured");
        console.error("usePush: NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing");
        setIsLoading(false);
        return false;
      }

      const keyBytes = urlBase64ToUint8Array(vapidKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes.buffer.slice(
          keyBytes.byteOffset,
          keyBytes.byteOffset + keyBytes.byteLength
        ) as ArrayBuffer,
      });

      const keys = subscription.toJSON().keys ?? {};

      const res = await fetch("/api/notifications/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        console.error("usePush: register failed", res.status, body);
        setError("Failed to save subscription");
        await subscription.unsubscribe();
        setIsLoading(false);
        return false;
      }

      setIsSubscribed(true);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error("usePush: subscribe error", err);
      setError(err instanceof Error ? err.message : "Push subscription failed");
      setIsLoading(false);
      return false;
    }
  }, [permission]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Delete from server first
        await fetch("/api/notifications/register", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      setIsLoading(false);
      return true;
    } catch {
      setIsLoading(false);
      return false;
    }
  }, []);

  return { permission, isSubscribed, isLoading, error, subscribe, unsubscribe };
}
