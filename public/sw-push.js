/**
 * Push Notification Service Worker
 *
 * This service worker handles incoming push notifications and displays them to the user.
 * It should be registered in your main application.
 */

// Event listener for push notifications
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event);

  let notificationData = {
    title: 'New Notification',
    body: 'You have a new notification',
    icon: '/favicon-192x192.png',
    badge: '/favicon-32x32.png',
    data: {},
  };

  // Parse the push data if available
  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        title: payload.title || notificationData.title,
        body: payload.body || notificationData.body,
        icon: payload.icon || notificationData.icon,
        badge: payload.badge || notificationData.badge,
        image: payload.image,
        data: payload.data || {},
      };
    } catch (e) {
      console.error('[Service Worker] Error parsing push data:', e);
      // If JSON parsing fails, try to use text
      notificationData.body = event.data.text();
    }
  }

  // Show the notification
  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    image: notificationData.image,
    data: notificationData.data,
    vibrate: [100, 50, 100],
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Open',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Event listener for notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event);

  event.notification.close();

  // Handle action buttons
  if (event.action === 'dismiss') {
    return;
  }

  // Get the URL to open from notification data
  const url = event.notification.data?.url || '/';

  // Focus on existing window or open new one
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus on an existing window
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            // Navigate to the URL
            if (url !== '/') {
              client.navigate(url);
            }
            return;
          }
        }

        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Event listener for notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notification closed:', event);
  // You could track dismissals here if needed
});

// Event listener for push subscription change
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[Service Worker] Push subscription changed:', event);

  // Re-subscribe and update the server
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: event.oldSubscription?.options?.applicationServerKey,
    }).then((subscription) => {
      // Send the new subscription to your server
      return fetch('/api/push/resubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          oldEndpoint: event.oldSubscription?.endpoint,
          newSubscription: subscription.toJSON(),
        }),
      });
    }).catch((error) => {
      console.error('[Service Worker] Failed to resubscribe:', error);
    })
  );
});

// Log activation
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Push notifications service worker activated');
});
