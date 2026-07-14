/* VYV service worker — web push notifications */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "VYV", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "VYV";
  // registration.scope is the app's base path (works for non-root deployments)
  const scope = self.registration.scope;
  const iconUrl = new URL("favicon.png", scope).href;
  const relative = (p) => new URL(String(p || "").replace(/^\//, ""), scope).href;
  const options = {
    body: data.body || "",
    icon: iconUrl,
    badge: iconUrl,
    tag: data.tag || undefined,
    data: { url: relative(data.url) },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url =
    (event.notification.data && event.notification.data.url) ||
    self.registration.scope;
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      }),
  );
});
