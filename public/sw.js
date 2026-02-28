// Loopzi Service Worker
// Handles: offline fallback, push notifications, notification clicks

const CACHE_NAME = "loopzi-v1";
const OFFLINE_URL = "/offline";

// ─── Install ───────────────────────────────────────────────
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([OFFLINE_URL]);
        })
    );
    self.skipWaiting();
});

// ─── Activate ──────────────────────────────────────────────
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// ─── Fetch (Network-first with offline fallback) ───────────
self.addEventListener("fetch", (event) => {
    if (event.request.mode === "navigate") {
        event.respondWith(
            fetch(event.request).catch(() => {
                return caches.match(OFFLINE_URL);
            })
        );
    }
});

// ─── Push Notifications ────────────────────────────────────
self.addEventListener("push", (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch (e) {
        data = {};
    }

    const title = data.title || "Loopzi Reminder";
    const options = {
        body: data.body || "Time to check in on your habits! 💪",
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-192x192.png",
        tag: data.tag || "habit-reminder",
        data: {
            url: data.url || "/today",
        },
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Notification Click ────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const url = event.notification.data && event.notification.data.url
        ? event.notification.data.url
        : "/today";

    event.waitUntil(
        self.clients.matchAll({ type: "window" }).then((clientList) => {
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url.includes(url) && "focus" in client) {
                    return client.focus();
                }
            }
            return self.clients.openWindow(url);
        })
    );
});
