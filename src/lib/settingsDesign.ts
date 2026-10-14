export function settingsDesignEnabled(
  hostname = window.location.hostname,
  preview = import.meta.env.VITE_SETTINGS_DESIGN === "true",
) {
  return (
    hostname === "gotit-dev.rbaseapp.com" ||
    (preview && ["localhost", "127.0.0.1", "[::1]"].includes(hostname))
  );
}

export const settingsSections = [
  "profile",
  "languages",
  "private-lessons",
  "learning",
  "interface",
  "extension",
  "notifications",
  "security",
  "subscription",
] as const;
export type SettingsSection = (typeof settingsSections)[number];
export function settingsSection(hash: string): SettingsSection {
  const value = hash.replace(/^#/, "");
  if (value === "reminders") return "notifications";
  return settingsSections.find((section) => section === value) ?? "profile";
}

export function profileTimezones(current: string) {
  // IANA values are validated again by the existing profile adapter and server.
  const intl = Intl as typeof Intl & {
    supportedValuesOf?: (key: "timeZone") => string[];
  };
  return [
    ...new Set([
      "UTC",
      current,
      ...(intl.supportedValuesOf?.("timeZone") ?? [
        "Asia/Jerusalem",
        "Europe/London",
        "America/New_York",
      ]),
    ]),
  ]
    .filter(Boolean)
    .sort();
}
