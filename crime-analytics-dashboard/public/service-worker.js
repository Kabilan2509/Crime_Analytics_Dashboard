// This service worker runs in the background to listen for Catalyst Push Notifications

self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Received.');
  let notificationData = {};
  try {
    notificationData = event.data.json();
  } catch (e) {
    notificationData = { title: 'MADHUKAR Alert', message: event.data.text() };
  }

  const title = notificationData.title || 'Critical Intelligence Alert';
  const options = {
    body: notificationData.message || 'New intelligence anomaly detected.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: notificationData.url || '/',
    vibrate: [200, 100, 200],
    requireInteraction: true
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});
