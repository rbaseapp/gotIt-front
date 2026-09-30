import { afterEach, expect, it, vi } from "vitest";
import { api } from "../src/lib/api";
import {
  getNotifications,
  saveNotifications,
  type NotificationPreferences,
} from "../src/lib/notifications";

const preferences: NotificationPreferences = {
  practiceEmail: false,
  practicePush: false,
  systemEmail: false,
  systemPush: false,
  reminderHour: 18,
  timezone: "Asia/Jerusalem",
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("loads notification preferences and channel availability", async () => {
  const product = vi
    .spyOn(api, "product")
    .mockImplementation(async (path) =>
      path === "notifications/preferences"
        ? { preferences }
        : { emailAvailable: true, pushAvailable: false },
    );
  const result = await getNotifications();
  expect(result.preferences.timezone).toBe("Asia/Jerusalem");
  expect(result.config.emailAvailable).toBe(true);
  expect(product).toHaveBeenCalledWith("notifications/preferences");
});

it("saves email consent with no push permission request", async () => {
  const product = vi.spyOn(api, "product").mockResolvedValue({
    preferences: { ...preferences, practiceEmail: true },
  });
  const patch = {
    practiceEmail: true,
    practicePush: false,
    systemEmail: false,
    systemPush: false,
    reminderHour: 18,
  };
  const result = await saveNotifications(patch, preferences, {
    emailAvailable: true,
    pushAvailable: false,
  });
  expect(result.practiceEmail).toBe(true);
  expect(product).toHaveBeenCalledWith(
    "notifications/preferences",
    "PATCH",
    patch,
  );
  expect(product).toHaveBeenCalledTimes(1);
});

it("registers a push endpoint without sending browser-only fields", async () => {
  const product = vi
    .spyOn(api, "product")
    .mockResolvedValue({ preferences: { ...preferences, practicePush: true } });
  const subscription = {
    endpoint: "https://fcm.googleapis.com/fcm/send/device",
    toJSON: () => ({
      endpoint: "https://fcm.googleapis.com/fcm/send/device",
      expirationTime: null,
      keys: { p256dh: "public", auth: "secret" },
    }),
  };
  vi.stubGlobal("PushManager", class {});
  vi.stubGlobal("Notification", { requestPermission: async () => "granted" });
  vi.stubGlobal("navigator", {
    serviceWorker: {
      register: async () => ({
        pushManager: {
          getSubscription: async () => subscription,
          subscribe: async () => {
            throw new Error("Should reuse subscription");
          },
        },
      }),
    },
  });
  const patch = {
    practiceEmail: false,
    practicePush: true,
    systemEmail: false,
    systemPush: false,
    reminderHour: 18,
  };
  await saveNotifications(patch, preferences, {
    emailAvailable: false,
    pushAvailable: true,
    vapidPublicKey: "YWJj",
  });
  expect(product).toHaveBeenNthCalledWith(
    1,
    "notifications/push-subscriptions",
    "POST",
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: "public", auth: "secret" },
    },
  );
});
