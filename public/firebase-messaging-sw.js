/* eslint-disable no-undef */
// Service worker for AvidityCarpool Firebase Web Push (FCM) notifications.
// Works natively with FCM Web Push payloads without baking Firebase keys into public/.

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { notification: { title: 'Avidity Carpool', body: event.data.text() } };
  }

  const notif = payload.notification || {};
  const data = payload.data || {};
  const title = notif.title || data.title || 'Avidity Carpool';
  const options = {
    body: notif.body || data.body || '',
    icon: notif.icon || '/icon-192.png',
    badge: notif.badge || '/icon-192.png',
    data: {
      url: data.url || payload.fcmOptions?.link || '/',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
