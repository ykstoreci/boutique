// Service Worker pour l'application administrateur PWA et les notifications Push iPhone (iOS >= 16.4)
const CACHE_NAME = "boutique-admin-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// ÉCOUTE DES NOTIFICATIONS PUSH ENVOYÉES VIA LE SERVEUR
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.title || "Nouvelle notification";
    const options = {
      body: payload.body || "",
      icon: payload.icon || "/icons/icon-192.png",
      badge: payload.badge || "/icons/icon-72.png",
      tag: payload.tag || "order-notif",
      data: payload.data || { url: "/admin/orders" },
      requireInteraction: true,
      vibrate: [200, 100, 200],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification("Nouvelle commande !", {
        body: text,
        icon: "/icons/icon-192.png",
        data: { url: "/admin/orders" },
      })
    );
  }
});

// CLIC SUR LA NOTIFICATION SUR L'ÉCRAN VÉRROUILLÉ OU LA BANNIÈRE
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/admin/orders";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes("/admin") && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

