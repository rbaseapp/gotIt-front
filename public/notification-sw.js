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
      data: { url: "/practice" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/practice"));
});
