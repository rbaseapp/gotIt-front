import { api } from "./api";
import i18n from "../i18n";

export type NotificationPreferences = {
  enabled?: boolean;
  reminderMinute?: number;
  reminderDays?: number[];
  quietEnabled?: boolean;
  quietStart?: number;
  quietEnd?: number;
  streakEmail?: boolean;
  streakPush?: boolean;
  weeklyEmail?: boolean;
  weeklyPush?: boolean;
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
  const enablingPush =
    (preferences.practicePush && !previous.practicePush) ||
    (preferences.systemPush && !previous.systemPush) ||
    (preferences.streakPush && !previous.streakPush) ||
    (preferences.weeklyPush && !previous.weeklyPush);
  if (enablingPush) {
    if (
      !config.vapidPublicKey ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    )
      throw new Error(i18n.t("settingsLive.pushUnsupported"));
    const permission = await Notification.requestPermission();
    if (permission !== "granted")
      throw new Error(i18n.t("settingsLive.pushDenied"));
    await navigator.serviceWorker.register("/notification-sw.js");
    const registration = await navigator.serviceWorker.ready;
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
  // Send only changed preferences. An unchanged Push opt-in must not prevent
  // saving email/time preferences on another device or when a provider is down.
  const patch = Object.fromEntries(
    Object.entries(preferences).filter(
      ([key, value]) => previous[key as keyof typeof preferences] !== value,
    ),
  );
  if (!Object.keys(patch).length) return previous;
  const result = (await api.product(
    "notifications/preferences",
    "PATCH",
    patch,
  )) as { preferences: Omit<NotificationPreferences, "timezone"> };
  return { ...result.preferences, timezone: previous.timezone };
}
