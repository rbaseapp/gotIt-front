import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "../../context/AppContext";
import { SettingsSave, SettingsChoice } from "./SettingsControls";
import { SettingsSwitch } from "./SettingsNotifications";
export function SettingsInterface() {
  const { t } = useTranslation();
  const { profile, updateProfile, profileError } = useApp();
  const initial = {
    enabledSkills:
      profile.learningPreferences?.enabledSkills ??
      ([
        "recognition",
        "recall",
        "listening",
        "spelling",
        "pronunciation",
      ] as const),
    ...profile.learningPreferences,
  };
  const [draft, setDraft] = useState({
      ...initial,
      enabledSkills: [...initial.enabledSkills],
    }),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false),
    [error, setError] = useState("");
  const dirty =
    JSON.stringify(draft) !==
    JSON.stringify({ ...initial, enabledSkills: [...initial.enabledSkills] });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        void updateProfile({ learningPreferences: draft })
          .then(() => setSaved(true))
          .catch((e) => setError(String(e.message)))
          .finally(() => setBusy(false));
      }}
    >
      <fieldset
        className="sd-card sd-interface"
        disabled={busy || !!profileError}
      >
        <SettingsChoice
          label={t("accountUi.textSize")}
          value={draft.textScale ?? "normal"}
          options={[
            { value: "normal", label: t("settingsLive.normal") },
            { value: "large", label: t("settingsLive.large") },
          ]}
          onChange={(textScale) => {
            setDraft({ ...draft, textScale });
            setSaved(false);
          }}
        />
        <SettingsChoice
          label={t("settingsLive.direction")}
          value={
            draft.textDirection ??
            (document.documentElement.dir as "rtl" | "ltr")
          }
          options={[
            { value: "rtl", label: t("settingsLive.rtl") },
            { value: "ltr", label: t("settingsLive.ltr") },
          ]}
          onChange={(textDirection) => {
            setDraft({ ...draft, textDirection });
            setSaved(false);
          }}
        />
        {(["reducedMotion", "sounds", "highContrast"] as const).map((key) => (
          <div className="sd-setting-row" key={key}>
            <div>
              <h2>{t(`settingsLive.${key}`)}</h2>
              <p>{t(`settingsLive.${key}Help`)}</p>
            </div>
            <SettingsSwitch
              label={t(`settingsLive.${key}`)}
              checked={draft[key] === true}
              onChange={(value) => {
                setDraft({ ...draft, [key]: value });
                setSaved(false);
              }}
            />
          </div>
        ))}
      </fieldset>
      <SettingsSave
        dirty={dirty}
        busy={busy || !!profileError}
        error={error || profileError || ""}
        saved={saved}
        onCancel={() =>
          setDraft({ ...initial, enabledSkills: [...initial.enabledSkills] })
        }
      />
    </form>
  );
}
