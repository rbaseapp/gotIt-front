import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "../context/AppContext";
import { normalizeUiLocale } from "../i18n";
import { getBilingualLanguageOptions } from "../lib/languages";
import type { UserProfile } from "../types";

export function InterfacePreferences({
  onReminders,
}: {
  onReminders: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { profile, updateProfile, profileError } = useApp();
  const [preferences, setPreferences] = useState({
    enabledSkills: [
      "recognition",
      "recall",
      "listening",
      "spelling",
      "pronunciation",
    ],
    ...profile.learningPreferences,
    uiLocale:
      profile.learningPreferences?.uiLocale ??
      normalizeUiLocale(i18n.resolvedLanguage) ??
      "en",
  } as NonNullable<UserProfile["learningPreferences"]>);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  useEffect(() => {
    if (profile.learningPreferences)
      setPreferences((current) => ({
        ...current,
        ...profile.learningPreferences,
      }));
  }, [profile.learningPreferences]);
  function patch(value: Partial<typeof preferences>) {
    setPreferences((current) => ({ ...current, ...value }));
    setSaved(false);
  }
  return (
    <form
      className="canonical-interface form-stack"
      data-figma-desktop="43:21941"
      onSubmit={(event) => {
        event.preventDefault();
        setBusy(true);
        setError("");
        void updateProfile({ learningPreferences: preferences })
          .then(() => setSaved(true))
          .catch((reason) =>
            setError(reason instanceof Error ? reason.message : String(reason)),
          )
          .finally(() => setBusy(false));
      }}
    >
      <fieldset
        className="ux-card canonical-fields"
        disabled={busy || !!profileError}
      >
        <label className="field">
          <span>{t("language.label")}</span>
          <select
            value={
              preferences.uiLocale ??
              normalizeUiLocale(i18n.resolvedLanguage) ??
              "en"
            }
            onChange={(event) =>
              patch({
                uiLocale: event.target.value as typeof preferences.uiLocale,
              })
            }
          >
            {getBilingualLanguageOptions()
              .filter(([code]) =>
                ["ar", "de", "en", "es", "fr", "he", "ru", "zh"].includes(code),
              )
              .map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
          </select>
        </label>
        <label className="field">
          <span>{t("accountUi.textSize")}</span>
          <select
            value={preferences.textScale ?? "normal"}
            onChange={(event) =>
              patch({ textScale: event.target.value as "normal" | "large" })
            }
          >
            <option value="normal">{t("accountUi.normalText")}</option>
            <option value="large">{t("accountUi.largeText")}</option>
          </select>
        </label>
        <div className="field">
          <span>{t("accountUi.motionSounds")}</span>
          <label className="canonical-check">
            <input
              type="checkbox"
              checked={preferences.reducedMotion ?? false}
              onChange={(event) =>
                patch({ reducedMotion: event.target.checked })
              }
            />
            {t("accountUi.reduceMotion")}
          </label>
          <label className="canonical-check">
            <input
              type="checkbox"
              checked={preferences.sounds ?? false}
              onChange={(event) => patch({ sounds: event.target.checked })}
            />
            {t("accountUi.feedbackSounds")}
          </label>
        </div>
        <button
          type="button"
          className="button secondary"
          onClick={onReminders}
        >
          {t("settings.remindersTitle")}
        </button>
      </fieldset>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <button className="button primary" disabled={busy || !!profileError}>
        {t(
          busy
            ? "settings.saving"
            : saved
              ? "settings.saved"
              : "accountUi.savePreferences",
        )}
      </button>
      {saved && (
        <p role="status" className="sr-only">
          {t("settings.changesSaved")}
        </p>
      )}
    </form>
  );
}
