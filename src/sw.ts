/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

// Precache all assets emitted by Vite build
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ── Push Notifications ──────────────────────────────────────────────────────

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
}

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload: PushPayload;
  try {
    payload = event.data.json() as PushPayload;
  } catch {
    payload = { title: 'Atlas', body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon ?? '/icon.svg',
      badge: '/icon.svg',
      tag: 'comunicado',
      renotify: true,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // Find an existing app window and navigate it to home/comunicados
        const appClient = clients.find(c =>
          new URL(c.url).origin === self.location.origin
        );
        if (appClient) {
          appClient.focus();
          // Tell the React app to navigate to the comunicados section
          appClient.postMessage({ type: 'NAVIGATE_TO_COMUNICADOS' });
          return;
        }
        // No window open — open a new one
        return self.clients.openWindow('/');
      })
  );
});
