import { api } from "./api";

export type NotificationPreferences = {
  practiceEmail: boolean;
  practicePush: boolean;
  systemEmail: boolean;
  systemPush: boolean;
  reminderHour: number;
  timezone: string;
};

export type NotificationConfig = {
  emailAvailable: boolean;
  pushAvailable: boolean;
  vapidPublicKey?: string;
};

export async function getNotifications(): Promise<{
  preferences: NotificationPreferences;
  config: NotificationConfig;
}> {
  const [preferences, config] = await Promise.all([
    api.product("notifications/preferences") as Promise<{
      preferences: NotificationPreferences;
    }>,
    api.product("notifications/config") as Promise<NotificationConfig>,
  ]);
  return { preferences: preferences.preferences, config };
}

export async function saveNotifications(
  preferences: Omit<NotificationPreferences, "timezone">,
  previous: NotificationPreferences,
  config: NotificationConfig,
) {
  if (preferences.practicePush || preferences.systemPush) {
    if (
      !config.vapidPublicKey ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    )
      throw new Error("Push notifications are unavailable in this browser.");
    const permission = await Notification.requestPermission();
    if (permission !== "granted")
      throw new Error("Push notification permission was not granted.");
    const registration = await navigator.serviceWorker.register(
      "/notification-sw.js",
    );
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: Uint8Array.from(
          atob(config.vapidPublicKey.replace(/-/g, "+").replace(/_/g, "/")),
          (character) => character.charCodeAt(0),
        ),
      }));
    const json = subscription.toJSON();
    await api.product("notifications/push-subscriptions", "POST", {
      endpoint: subscription.endpoint,
      keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
    });
  }
  const result = (await api.product(
    "notifications/preferences",
    "PATCH",
    preferences,
  )) as { preferences: Omit<NotificationPreferences, "timezone"> };
  return { ...result.preferences, timezone: previous.timezone };
}
