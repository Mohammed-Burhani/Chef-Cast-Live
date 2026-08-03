/* eslint-env serviceworker */
/* globals self, clients */

/**
 * ChefCast: Live — web push service worker
 *
 * Registered by expo-notifications (see `notification.serviceWorkerPath` in
 * app.json). It is responsible for:
 *  - showing a system notification when a push message arrives — even while
 *    the browser / tab is closed
 *  - opening the episode page when the user clicks the notification
 *
 * Expo's push service delivers the message JSON to the `push` event below, so
 * `event.data.json()` looks like:
 *   { title, body, data: { type, episodeId, url, ... } }
 */

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_err) {
    // Malformed payload — fall back to defaults below.
  }

  const title = data.title || 'ChefCast: Live';
  const options = {
    body: data.body || '',
    icon: data.icon || undefined,
    badge: data.badge || undefined,
    data: data.data || {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const target = event.notification.data && event.notification.data.url;
  if (!target) return;

  // Resolve relative paths (e.g. "/episode/<id>") against the origin.
  let url;
  try {
    url = new URL(target, self.location.origin).href;
  } catch (_err) {
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const existing = windowClients.find((client) => client.url === url);
      if (existing && 'focus' in existing) {
        existing.navigate(url);
        return existing.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
