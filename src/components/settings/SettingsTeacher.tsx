import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "../../context/AppContext";
import {
  getPrivateLessonSetup,
  getSavedPrivateLessonLanguage,
  savePrivateLessonPreferences,
  privateLessonSpeechRates,
  type PrivateLessonPreferences,
} from "../../lib/privateLesson";
import { SettingsSave, SettingsChoice } from "./SettingsControls";
import female from "../../assets/ux/lesson-teacher-female.png";
import male from "../../assets/ux/lesson-teacher-male.png";
export function SettingsTeacher() {
  const { t } = useTranslation();
  const { profile, mode } = useApp();
  const language = getSavedPrivateLessonLanguage(
    profile.languages[0]?.languageCode || profile.defaultSourceLanguage || "en",
  );
  const [draft, setDraft] = useState<PrivateLessonPreferences | null>(null),
    [initial, setInitial] = useState<PrivateLessonPreferences | null>(null),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setDraft(null);
    setError("");
    const fallback: PrivateLessonPreferences = {
      supportLanguageCode: profile.defaultTranslationLanguage,
      lessonMode: "standard",
      teachingLanguage: "target",
      requestedDurationMinutes: 10,
      teacherVoice: "female",
      speechRate: "normal",
      focusAreas: ["speaking", "vocabulary"],
      customFocus: null,
      correctionMode: "recast",
      vocabularyMode: "learned",
    };
    const request =
      mode === "demo"
        ? Promise.resolve({ preferences: fallback })
        : getPrivateLessonSetup(language);
    void request
      .then((result) => {
        if (active) {
          setDraft(result.preferences ?? fallback);
          setInitial(result.preferences ?? fallback);
        }
      })
      .catch((e) => active && setError(String(e.message)));
    return () => {
      active = false;
    };
  }, [language, mode, attempt, profile.defaultTranslationLanguage]);
  if (!draft || !initial)
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
  function patch(value: Partial<PrivateLessonPreferences>) {
    setDraft((current) => current && { ...current, ...value });
    setSaved(false);
  }
  return (
    <form
      className="sd-editor"
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        void (
          mode === "demo"
            ? Promise.resolve()
            : savePrivateLessonPreferences(language, draft)
        )
          .then(() => {
            setInitial(draft);
            setSaved(true);
          })
          .catch((e) => setError(String(e.message)))
          .finally(() => setBusy(false));
      }}
    >
      <fieldset className="sd-fields" disabled={busy}>
        <section className="sd-card">
          <SettingsChoice
            label={t("settingsLive.lessonType")}
            value={draft.lessonMode}
            options={[
              { value: "standard", label: t("settingsLive.standardLesson") },
              {
                value: "absolute_beginner",
                label: t("settingsLive.beginnerLesson"),
              },
            ]}
            onChange={(lessonMode) => patch({ lessonMode })}
          />
          <SettingsChoice
            label={t("settingsLive.lessonDuration")}
            value={draft.requestedDurationMinutes}
            options={([5, 10, 15, 20] as const).map((value) => ({
              value,
              label: t("settingsLive.minutes", { count: value }),
            }))}
            onChange={(requestedDurationMinutes) =>
              patch({ requestedDurationMinutes })
            }
          />
          <h2>{t("settingsLive.speechRate")}</h2>
          <div
            className="sd-speed"
            role="group"
            aria-label={t("settingsLive.speechRate")}
          >
            {privateLessonSpeechRates.map((rate) => (
              <button
                type="button"
                key={rate}
                aria-pressed={draft.speechRate === rate}
                onClick={() => patch({ speechRate: rate })}
              >
                <span />
                {t(`privateLesson.speedOptions.${rate}`)}
              </button>
            ))}
          </div>
        </section>
        <section className="sd-card">
          <h2>{t("settingsLive.chooseTeacher")}</h2>
          <div className="sd-teachers">
            {(["female", "male"] as const).map((voice) => (
              <button
                type="button"
                key={voice}
                aria-pressed={draft.teacherVoice === voice}
                onClick={() => patch({ teacherVoice: voice })}
              >
                <img src={voice === "female" ? female : male} alt="" />
                <strong>{t(`settingsLive.teacher_${voice}`)}</strong>
                <span>{t(`settingsLive.teacher_${voice}Help`)}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="sd-card">
          <h2>{t("settingsLive.practiceFocus")}</h2>
          <div className="sd-tiles">
            {(
              [
                "speaking",
                "pronunciation",
                "fluency",
                "grammar",
                "vocabulary",
                "listening",
              ] as const
            ).map((focus) => (
              <button
                type="button"
                key={focus}
                aria-pressed={draft.focusAreas.includes(focus)}
                onClick={() =>
                  patch({
                    focusAreas: draft.focusAreas.includes(focus)
                      ? draft.focusAreas.length > 1
                        ? draft.focusAreas.filter((f) => f !== focus)
                        : draft.focusAreas
                      : [...draft.focusAreas, focus],
                  })
                }
              >
                {t(`privateLesson.focus.options.${focus}`)}
              </button>
            ))}
          </div>
          <SettingsChoice
            label={t("settingsLive.vocabularyMix")}
            value={draft.vocabularyMode}
            options={[
              { value: "none", label: t("settingsLive.noMix") },
              { value: "learned", label: t("settingsLive.learnedMix") },
            ]}
            onChange={(vocabularyMode) => patch({ vocabularyMode })}
          />
          <label className="field">
            <span>{t("settingsLive.personalGoal")}</span>
            <textarea
              maxLength={500}
              value={draft.customFocus ?? ""}
              onChange={(e) =>
                patch({ customFocus: e.currentTarget.value || null })
              }
            />
          </label>
        </section>
      </fieldset>
      <SettingsSave
        dirty={JSON.stringify(draft) !== JSON.stringify(initial)}
        busy={busy}
        error={error}
        saved={saved}
        onCancel={() => setDraft(initial)}
      />
    </form>
  );
}
