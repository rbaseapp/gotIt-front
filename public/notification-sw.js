self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    /* ignore malformed payload */
  }
  const title = typeof payload.title === "string" ? payload.title : "GotIt";
  const body = typeof payload.body === "string" ? payload.body : "";
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      data: { url: "/learn" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windows) => {
        const existing = windows.find(
          (client) => new URL(client.url).origin === self.location.origin,
        );
        if (existing)
          return existing.navigate("/learn").then((client) => client?.focus());
        return clients.openWindow("/learn");
      }),
  );
});
