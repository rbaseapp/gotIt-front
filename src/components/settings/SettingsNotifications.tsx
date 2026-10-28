import settingsI18n from "../../i18n";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useApp } from "../../context/AppContext";
import {
  getNotifications,
  saveNotifications,
  type NotificationPreferences,
  type NotificationConfig,
} from "../../lib/notifications";

const defaults: NotificationPreferences = {
  enabled: true,
  practiceEmail: false,
  practicePush: false,
  systemEmail: false,
  systemPush: false,
  streakEmail: false,
  streakPush: false,
  weeklyEmail: false,
  weeklyPush: false,
  reminderHour: 18,
  reminderMinute: 0,
  reminderDays: [0, 1, 2, 3, 4, 5, 6],
  quietEnabled: false,
  quietStart: 1320,
  quietEnd: 420,
  timezone: "UTC",
};
const time = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
const minutes = (value: string) =>
  Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
export function SettingsSwitch({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      disabled={disabled}
      className={`sd-switch${checked ? " on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}
export function SettingsNotifications() {
  const { t, i18n } = useTranslation();
  const { mode, user, profile } = useApp();
  const [draft, setDraft] = useState<NotificationPreferences | null>(null),
    [previous, setPrevious] = useState<NotificationPreferences | null>(null),
    [config, setConfig] = useState<NotificationConfig | null>(null);
  const [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [saved, setSaved] = useState(false),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setError("");
    setDraft(null);
    setPrevious(null);
    const request =
      mode === "demo"
        ? Promise.resolve({
            preferences: { ...defaults, timezone: profile.timezone },
            config: { emailAvailable: false, pushAvailable: false },
          })
        : getNotifications();
    void request
      .then((result) => {
        if (active) {
          const value = { ...defaults, ...result.preferences };
          setDraft(value);
          setPrevious(value);
          setConfig(result.config);
        }
      })
      .catch((reason) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : settingsI18n.t("settings.saveFailed"),
          );
      });
    return () => {
      active = false;
    };
  }, [attempt, mode, profile.timezone]);
  function patch(value: Partial<NotificationPreferences>) {
    setSaved(false);
    setDraft((current) => current && { ...current, ...value });
  }
  if (!draft || !previous || !config)
    return (
      <section className="sd-card">
        {error ? (
          <p role="alert">
            {error}
            <button
              className="sd-outline"
              onClick={() => setAttempt((v) => v + 1)}
            >
              {t("common.tryAgain")}
            </button>
          </p>
        ) : (
          <p role="status">{t("common.loading")}</p>
        )}
      </section>
    );
  const dirty = JSON.stringify(draft) !== JSON.stringify(previous);
  const pushSupported =
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;
  const emailReason = !config.emailAvailable
    ? "emailUnavailable"
    : !user?.emailVerified
      ? "emailUnverified"
      : null;
  const pushReason = !config.pushAvailable
    ? "pushUnavailable"
    : !pushSupported
      ? "pushUnsupported"
      : Notification.permission === "denied"
        ? "pushDenied"
        : null;
  const enabled = draft.enabled !== false;
  async function save() {
    if (!draft || !previous || !config) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const { timezone, ...input } = draft;
      const value =
        mode === "demo"
          ? { ...input, timezone }
          : await saveNotifications(input, previous, config);
      setDraft(value);
      setPrevious(value);
      setSaved(true);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : t("settings.saveFailed"),
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <form
      className="sd-notifications"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <section className="sd-card sd-setting-row">
        <div>
          <h2>{t("settingsLive.notificationsMaster")}</h2>
          <p>{t("settingsLive.notificationsMasterHelp")}</p>
        </div>
        <SettingsSwitch
          label={t("settingsLive.notificationsMaster")}
          checked={enabled}
          disabled={saving}
          onChange={(v) => patch({ enabled: v })}
        />
      </section>
      <fieldset
        className="sd-card sd-reminder-schedule"
        disabled={saving || !enabled}
      >
        <label className="field">
          <span>{t("settings.reminderHour")}</span>
          <input
            type="time"
            required
            value={time(draft.reminderHour * 60 + (draft.reminderMinute ?? 0))}
            onChange={(e) => {
              if (e.currentTarget.value) {
                const value = minutes(e.currentTarget.value);
                patch({
                  reminderHour: Math.floor(value / 60),
                  reminderMinute: value % 60,
                });
              }
            }}
          />
        </label>
        <div
          className="sd-days"
          role="group"
          aria-label={t("settingsLive.reminderDays")}
        >
          {Array.from({ length: 7 }, (_, day) => {
            const date = new Date(Date.UTC(2026, 0, 4 + day));
            const full = new Intl.DateTimeFormat(i18n.resolvedLanguage, {
              weekday: "long",
              timeZone: "UTC",
            }).format(date);
            return (
              <button
                type="button"
                key={day}
                aria-label={full}
                aria-pressed={draft.reminderDays?.includes(day)}
                onClick={() =>
                  patch({
                    reminderDays: draft.reminderDays?.includes(day)
                      ? draft.reminderDays.filter((d) => d !== day)
                      : [...(draft.reminderDays ?? []), day].sort(),
                  })
                }
              >
                {new Intl.DateTimeFormat(i18n.resolvedLanguage, {
                  weekday: "narrow",
                  timeZone: "UTC",
                }).format(date)}
              </button>
            );
          })}
        </div>
        <small>
          {t("settingsLive.timezone", { zone: profile.timezone })}{" "}
          <Link to="/settings#profile">{t("settingsDesign.change")}</Link>
        </small>
      </fieldset>
      <fieldset
        className="sd-card sd-notification-matrix"
        disabled={saving || !enabled}
      >
        <div className="sd-matrix-row sd-matrix-heading">
          <span />
          <b>Push</b>
          <b>{t("settingsLive.emailChannel")}</b>
        </div>
        {(["practice", "streak", "weekly", "system"] as const).map((kind) => (
          <div className="sd-matrix-row" key={kind}>
            <div>
              <h2>{t(`settingsLive.${kind}Title`)}</h2>
              <p>{t(`settingsLive.${kind}Help`)}</p>
            </div>
            {(["Push", "Email"] as const).map((channel) => {
              const key = `${kind}${channel}` as keyof NotificationPreferences;
              const checked = draft[key] === true;
              const reason = channel === "Email" ? emailReason : pushReason;
              return (
                <SettingsSwitch
                  key={channel}
                  label={`${t(`settingsLive.${kind}Title`)} — ${channel === "Email" ? t("settingsLive.emailChannel") : "Push"}`}
                  checked={checked}
                  disabled={!!reason && !checked}
                  onChange={(v) => patch({ [key]: v })}
                />
              );
            })}
          </div>
        ))}
        {emailReason && (
          <p className="sd-channel-note">{t(`settingsLive.${emailReason}`)}</p>
        )}
        {pushReason && (
          <p className="sd-channel-note">{t(`settingsLive.${pushReason}`)}</p>
        )}
      </fieldset>
      <section className="sd-card sd-setting-row">
        <div>
          <h2>{t("settingsLive.quietHours")}</h2>
          <p>{t("settingsLive.quietHoursHelp")}</p>
          <div className="sd-time-range">
            <input
              type="time"
              aria-label={t("settingsLive.quietStart")}
              value={time(draft.quietStart ?? 1320)}
              disabled={saving || !enabled || !draft.quietEnabled}
              onChange={(e) =>
                e.currentTarget.value &&
                patch({ quietStart: minutes(e.currentTarget.value) })
              }
            />
            <span>–</span>
            <input
              type="time"
              aria-label={t("settingsLive.quietEnd")}
              value={time(draft.quietEnd ?? 420)}
              disabled={saving || !enabled || !draft.quietEnabled}
              onChange={(e) =>
                e.currentTarget.value &&
                patch({ quietEnd: minutes(e.currentTarget.value) })
              }
            />
          </div>
        </div>
        <SettingsSwitch
          label={t("settingsLive.quietHours")}
          checked={draft.quietEnabled === true}
          disabled={saving || !enabled}
          onChange={(v) => patch({ quietEnabled: v })}
        />
      </section>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {saved && <p role="status">{t("settings.changesSaved")}</p>}
      {dirty && (
        <div className="sd-savebar">
          <span>{t("settingsLive.unsaved")}</span>
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              setDraft(previous);
              setError("");
            }}
          >
            {t("common.cancel")}
          </button>
          <button disabled={saving}>
            {t(saving ? "settings.saving" : "settings.saveChanges")}
          </button>
        </div>
      )}
    </form>
  );
}
