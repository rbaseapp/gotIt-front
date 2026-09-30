import { useEffect, useState, type FormEvent } from "react";
import {
  Check,
  Globe2,
  LoaderCircle,
  Mic2,
  Plus,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { validateProfile } from "../lib/contracts";
import { Modal } from "../components/Modal";
import type { UserProfile } from "../types";
import { getBilingualLanguageOptions } from "../lib/languages";
import { LanguageCombobox } from "../components/LanguageCombobox";
import { useTranslation } from "react-i18next";
import { UiLanguageSelect } from "../components/UiLanguageSelect";
import {
  getPrivateLessonSetup,
  getSavedPrivateLessonLanguage,
  privateLessonCorrectionModes,
  privateLessonFocusAreas,
  privateLessonSpeechRates,
  privateLessonVocabularyModes,
  savePrivateLessonLanguage,
  savePrivateLessonPreferences,
  type PrivateLessonFocusArea,
  type PrivateLessonPreferences,
} from "../lib/privateLesson";

const defaultLessonPreferences: PrivateLessonPreferences = {
  supportLanguageCode: null,
  lessonMode: "standard",
  requestedDurationMinutes: 5,
  teacherVoice: "female",
  speechRate: "normal",
  focusAreas: ["speaking", "vocabulary"],
  customFocus: null,
  correctionMode: "recast",
  vocabularyMode: "learned",
};

export function SettingsPage() {
  const { t } = useTranslation();
  const languageOptions = getBilingualLanguageOptions();
  const {
    profile,
    updateProfile,
    resetDemo,
    mode,
    profileError,
    retryProfile,
  } = useApp();
  const [form, setForm] = useState(profile);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newInterest, setNewInterest] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [lessonLanguage, setLessonLanguage] = useState(() =>
    getSavedPrivateLessonLanguage(
      profile.languages[0]?.languageCode ||
        profile.defaultSourceLanguage ||
        "en",
    ),
  );
  const [lessonPreferences, setLessonPreferences] =
    useState<PrivateLessonPreferences>({
      ...defaultLessonPreferences,
      supportLanguageCode: profile.defaultTranslationLanguage,
    });
  const [lessonSettingsLoading, setLessonSettingsLoading] = useState(false);
  const [
    lessonPreferencesRemoteAvailable,
    setLessonPreferencesRemoteAvailable,
  ] = useState(false);
  useEffect(() => {
    setForm(structuredClone(profile));
  }, [profile]);
  useEffect(() => {
    if (mode !== "live" || !lessonLanguage) return;
    let active = true;
    setLessonSettingsLoading(true);
    setLessonPreferencesRemoteAvailable(false);
    void getPrivateLessonSetup(lessonLanguage)
      .then((setup) => {
        if (!active) return;
        setLessonPreferencesRemoteAvailable(true);
        setLessonPreferences(
          setup.preferences ?? {
            ...defaultLessonPreferences,
            supportLanguageCode:
              profile.defaultTranslationLanguage === lessonLanguage
                ? null
                : profile.defaultTranslationLanguage,
          },
        );
      })
      .catch(
        (reason) =>
          active &&
          setError(reason instanceof Error ? reason.message : String(reason)),
      )
      .finally(() => active && setLessonSettingsLoading(false));
    return () => {
      active = false;
    };
  }, [lessonLanguage, mode, profile.defaultTranslationLanguage]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const problem = validateProfile(form);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    try {
      await updateProfile(form);
      savePrivateLessonLanguage(lessonLanguage);
      if (mode === "live" && lessonPreferencesRemoteAvailable)
        await savePrivateLessonPreferences(lessonLanguage, lessonPreferences);
      setSaved(true);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : t("settings.saveFailed"),
      );
    } finally {
      setSaving(false);
    }
  };
  const patch = (value: Partial<UserProfile>) => {
    setSaved(false);
    setForm((current) => ({ ...current, ...value }));
  };
  const addInterest = () => {
    const value = newInterest.normalize("NFKC").replace(/\s+/gu, " ").trim();
    if (
      value &&
      !form.interests.some(
        (interest) => interest.toLowerCase() === value.toLowerCase(),
      )
    )
      patch({ interests: [...form.interests, value] });
    setNewInterest("");
  };
  const toggleLessonFocus = (area: PrivateLessonFocusArea) => {
    setSaved(false);
    setLessonPreferences((current) => ({
      ...current,
      focusAreas: current.focusAreas.includes(area)
        ? current.focusAreas.length === 1
          ? current.focusAreas
          : current.focusAreas.filter((item) => item !== area)
        : [...current.focusAreas, area],
    }));
  };
  return (
    <div className="settings-page page-enter">
      <section className="page-heading-row">
        <div>
          <p className="eyebrow">{t("settings.eyebrow")}</p>
          <h1>{t("settings.title")}</h1>
          <p>
            {mode === "live"
              ? t("settings.liveDescription")
              : t("settings.demoDescription")}
          </p>
        </div>
      </section>
      {profileError && (
        <div className="form-error" role="alert">
          {profileError}
          <button
            type="button"
            className="button ghost"
            onClick={() => void retryProfile()}
          >
            {t("common.tryAgain")}
          </button>
        </div>
      )}
      <form
        onSubmit={(event) => void submit(event)}
        className="settings-layout"
      >
        <nav className="settings-nav">
          <a href="#interface">
            <Globe2 size={18} />
            {t("settings.interfaceSection")}
          </a>
          <a href="#profile">
            <UserRound size={18} />
            {t("settings.profileNav")}
          </a>
          <a href="#languages">
            <Globe2 size={18} />
            {t("settings.languagesNav")}
          </a>
          <a href="#private-lessons">
            <Mic2 size={18} />
            {t("settings.privateLessonNav", {
              defaultValue: "Private lessons",
            })}
          </a>
          <a href="#learning">
            <SlidersHorizontal size={18} />
            {t("settings.learningNav")}
          </a>
        </nav>
        <div className="settings-content">
          <fieldset
            className="settings-form-body"
            disabled={saving || !!profileError}
          >
            <section className="settings-card" id="interface">
              <div className="settings-card-heading">
                <span className="settings-icon purple">
                  <Globe2 size={21} />
                </span>
                <div>
                  <h2>{t("settings.interfaceSection")}</h2>
                  <p>{t("settings.interfaceDescription")}</p>
                </div>
              </div>
              <UiLanguageSelect />
              <p className="muted-note">{t("settings.savedLocally")}</p>
            </section>
            <section className="settings-card" id="profile">
              <div className="settings-card-heading">
                <span className="settings-icon green">
                  <UserRound size={21} />
                </span>
                <div>
                  <h2>{t("settings.personalTitle")}</h2>
                  <p>{t("settings.personalDescription")}</p>
                </div>
              </div>
              <div className="settings-fields">
                <label className="field">
                  <span>
                    {t("settings.displayName")}{" "}
                    <small>
                      {mode === "live"
                        ? t("settings.localTab")
                        : t("settings.demo")}
                    </small>
                  </span>
                  <input
                    required
                    maxLength={80}
                    value={form.name}
                    onChange={(event) => patch({ name: event.target.value })}
                  />
                </label>
                <label className="field">
                  <span>{t("settings.email")}</span>
                  <input type="email" value={form.email} disabled dir="ltr" />
                </label>
                <label className="field full">
                  <span>{t("settings.timezone")}</span>
                  <input
                    list="timezones"
                    value={form.timezone}
                    onChange={(event) =>
                      patch({ timezone: event.target.value })
                    }
                    dir="ltr"
                    required
                    maxLength={100}
                  />
                  <datalist id="timezones">
                    <option>Asia/Jerusalem</option>
                    <option>Europe/London</option>
                    <option>America/New_York</option>
                    <option>UTC</option>
                  </datalist>
                </label>
              </div>
            </section>
            <section className="settings-card" id="languages">
              <div className="settings-card-heading">
                <span className="settings-icon purple">
                  <Globe2 size={21} />
                </span>
                <div>
                  <h2>{t("settings.languagesTitle")}</h2>
                  <p>{t("settings.languagesDescription")}</p>
                </div>
              </div>
              <label className="field">
                <span>{t("settings.sourceLanguage")}</span>
                <LanguageCombobox
                  value={form.defaultSourceLanguage || ""}
                  onChange={(code) =>
                    patch({
                      defaultSourceLanguage: code || null,
                    })
                  }
                  options={languageOptions}
                  emptyLabel={t("settings.autoDetect")}
                />
                <small className="muted-note">
                  {t("settings.autoDetectHelp")}
                </small>
              </label>
              <label className="field">
                <span>{t("settings.translationLanguage")}</span>
                <LanguageCombobox
                  value={form.defaultTranslationLanguage || ""}
                  onChange={(code) =>
                    patch({
                      defaultTranslationLanguage: code || null,
                    })
                  }
                  options={languageOptions}
                  emptyLabel={t("settings.chooseTranslationLanguage")}
                />
                <small className="muted-note">
                  {t("settings.translationLanguageHelp")}
                </small>
              </label>
              <div className="language-editor">
                {form.languages.map((language, index) => (
                  <div className="language-editor-row" key={index}>
                    <label className="field">
                      <span>{t("language.label")}</span>
                      <LanguageCombobox
                        ariaLabel={t("settings.languageNumber", {
                          number: index + 1,
                        })}
                        value={language.languageCode}
                        required
                        options={languageOptions}
                        onChange={(code) =>
                          patch({
                            languages: form.languages.map((value, i) =>
                              i === index
                                ? { ...value, languageCode: code }
                                : value,
                            ),
                          })
                        }
                      />
                    </label>
                    <label className="field">
                      <span>{t("settings.selfLevel")}</span>
                      <select
                        value={language.selfAssessedLevel || ""}
                        onChange={(event) =>
                          patch({
                            languages: form.languages.map((value, i) =>
                              i === index
                                ? {
                                    ...value,
                                    selfAssessedLevel: (event.target.value ||
                                      null) as typeof language.selfAssessedLevel,
                                  }
                                : value,
                            ),
                          })
                        }
                      >
                        <option value="">{t("settings.notSet")}</option>
                        {["A1", "A2", "B1", "B2", "C1", "C2"].map((level) => (
                          <option key={level}>{level}</option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={t("settings.removeLanguage")}
                      onClick={() =>
                        patch({
                          languages: form.languages.filter(
                            (_, i) => i !== index,
                          ),
                        })
                      }
                    >
                      <Trash2 size={17} />
                    </button>
                    {mode === "live" &&
                      (language.effectiveLevel ||
                        language.systemEstimatedLevel) && (
                        <small className="muted-note">
                          {t("settings.effectiveLevel", {
                            level: language.effectiveLevel || "—",
                          })}{" "}
                          ·{" "}
                          {t("settings.systemLevel", {
                            level: language.systemEstimatedLevel || "—",
                          })}
                          {language.systemConfidence !== null &&
                          language.systemConfidence !== undefined
                            ? ` · ${t("settings.confidence", { value: Math.round(language.systemConfidence * 100) })}`
                            : ""}
                        </small>
                      )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="button secondary"
                disabled={form.languages.length >= 100}
                onClick={() =>
                  patch({
                    languages: [
                      ...form.languages,
                      { languageCode: "", selfAssessedLevel: null },
                    ],
                  })
                }
              >
                <Plus size={16} />
                {t("settings.addLearningLanguage")}
              </button>
              <p className="muted-note">{t("settings.levelHelp")}</p>
            </section>
            <section className="settings-card" id="private-lessons">
              <div className="settings-card-heading">
                <span className="settings-icon green">
                  <Mic2 size={21} />
                </span>
                <div>
                  <h2>
                    {t("settings.privateLessonTitle", {
                      defaultValue: "Private lesson preferences",
                    })}
                  </h2>
                  <p>
                    {t("settings.privateLessonDescription", {
                      defaultValue:
                        "Choose your regular lesson language and teaching style once. You can still make a one-time change before a lesson.",
                    })}
                  </p>
                </div>
              </div>
              <fieldset
                className="plain-fieldset form-stack"
                disabled={lessonSettingsLoading}
              >
                <div className="settings-fields">
                  <label className="field">
                    <span>{t("privateLesson.mode.title")}</span>
                    <select
                      value={lessonPreferences.lessonMode}
                      onChange={(event) => {
                        setSaved(false);
                        setLessonPreferences((current) => ({
                          ...current,
                          lessonMode: event.target
                            .value as PrivateLessonPreferences["lessonMode"],
                        }));
                      }}
                    >
                      <option value="standard">
                        {t("privateLesson.mode.options.standard.title")}
                      </option>
                      <option value="absolute_beginner">
                        {t(
                          "privateLesson.mode.options.absolute_beginner.title",
                        )}
                      </option>
                    </select>
                  </label>
                  <label className="field">
                    <span>{t("privateLesson.targetLanguage")}</span>
                    <LanguageCombobox
                      value={lessonLanguage}
                      options={languageOptions}
                      onChange={(code) => {
                        setSaved(false);
                        setLessonLanguage(code);
                      }}
                    />
                  </label>
                  <label className="field">
                    <span>{t("privateLesson.supportLanguage")}</span>
                    <LanguageCombobox
                      value={lessonPreferences.supportLanguageCode ?? ""}
                      required={
                        lessonPreferences.lessonMode === "absolute_beginner"
                      }
                      onChange={(code) => {
                        setSaved(false);
                        setLessonPreferences((current) => ({
                          ...current,
                          supportLanguageCode: code || null,
                        }));
                      }}
                      options={languageOptions.filter(([code]) => code !== lessonLanguage)}
                      emptyLabel={t("privateLesson.noSupport")}
                    />
                  </label>
                  <label className="field">
                    <span>{t("privateLesson.duration")}</span>
                    <select
                      value={lessonPreferences.requestedDurationMinutes}
                      onChange={(event) => {
                        setSaved(false);
                        setLessonPreferences((current) => ({
                          ...current,
                          requestedDurationMinutes: Number(
                            event.target.value,
                          ) as PrivateLessonPreferences["requestedDurationMinutes"],
                        }));
                      }}
                    >
                      {([1, 5, 10, 15] as const).map((value) => (
                        <option key={value} value={value}>
                          {t(`privateLesson.durationOptions.${value}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>{t("privateLesson.teacherVoice")}</span>
                    <select
                      value={lessonPreferences.teacherVoice}
                      onChange={(event) => {
                        setSaved(false);
                        setLessonPreferences((current) => ({
                          ...current,
                          teacherVoice: event.target
                            .value as PrivateLessonPreferences["teacherVoice"],
                        }));
                      }}
                    >
                      <option value="female">
                        {t("privateLesson.voiceOptions.female")}
                      </option>
                      <option value="male">
                        {t("privateLesson.voiceOptions.male")}
                      </option>
                    </select>
                  </label>
                  <label className="field">
                    <span>{t("privateLesson.speechRate")}</span>
                    <select
                      value={lessonPreferences.speechRate}
                      onChange={(event) => {
                        setSaved(false);
                        setLessonPreferences((current) => ({
                          ...current,
                          speechRate: event.target
                            .value as PrivateLessonPreferences["speechRate"],
                        }));
                      }}
                    >
                      {privateLessonSpeechRates.map((value) => (
                        <option key={value} value={value}>
                          {t(`privateLesson.speedOptions.${value}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="field private-lesson-focus-field">
                  <span>{t("privateLesson.focus.title")}</span>
                  <small>
                    {t("settings.privateLessonFocusHelp", {
                      defaultValue:
                        "These are the default skills emphasized in every lesson.",
                    })}
                  </small>
                  <div className="private-lesson-focus-options">
                    {privateLessonFocusAreas.map((area) => (
                      <label
                        key={area}
                        className={
                          lessonPreferences.focusAreas.includes(area)
                            ? "selected"
                            : ""
                        }
                      >
                        <input
                          type="checkbox"
                          checked={lessonPreferences.focusAreas.includes(area)}
                          onChange={() => toggleLessonFocus(area)}
                        />
                        <span>{t(`privateLesson.focus.options.${area}`)}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="settings-fields">
                  <label className="field">
                    <span>{t("privateLesson.correctionMode.title")}</span>
                    <select
                      value={lessonPreferences.correctionMode}
                      onChange={(event) => {
                        setSaved(false);
                        setLessonPreferences((current) => ({
                          ...current,
                          correctionMode: event.target
                            .value as PrivateLessonPreferences["correctionMode"],
                        }));
                      }}
                    >
                      {privateLessonCorrectionModes.map((value) => (
                        <option key={value} value={value}>
                          {t(
                            `privateLesson.correctionMode.options.${value}.title`,
                          )}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>{t("privateLesson.vocabularyMode.title")}</span>
                    <select
                      value={lessonPreferences.vocabularyMode}
                      onChange={(event) => {
                        setSaved(false);
                        setLessonPreferences((current) => ({
                          ...current,
                          vocabularyMode: event.target
                            .value as PrivateLessonPreferences["vocabularyMode"],
                        }));
                      }}
                    >
                      {privateLessonVocabularyModes.map((value) => (
                        <option key={value} value={value}>
                          {t(
                            `privateLesson.vocabularyMode.options.${value}.title`,
                          )}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field full">
                    <span>{t("privateLesson.customFocus")}</span>
                    <textarea
                      rows={2}
                      maxLength={300}
                      value={lessonPreferences.customFocus ?? ""}
                      onChange={(event) => {
                        setSaved(false);
                        setLessonPreferences((current) => ({
                          ...current,
                          customFocus: event.target.value || null,
                        }));
                      }}
                      placeholder={t("privateLesson.customFocusPlaceholder")}
                    />
                  </label>
                </div>
                {lessonSettingsLoading && (
                  <p className="muted-note">
                    <LoaderCircle className="spin" size={16} />{" "}
                    {t("common.loadingFromServer")}
                  </p>
                )}
              </fieldset>
            </section>
            <section className="settings-card" id="learning">
              <div className="settings-card-heading">
                <span className="settings-icon orange">
                  <SlidersHorizontal size={21} />
                </span>
                <div>
                  <h2>{t("settings.learningTitle")}</h2>
                  <p>{t("settings.learningDescription")}</p>
                </div>
              </div>
              <div className="settings-fields">
                <label className="field">
                  <span>{t("settings.goalType")}</span>
                  <select
                    value={form.dailyGoal.type}
                    onChange={(event) =>
                      patch({
                        dailyGoal: {
                          ...form.dailyGoal,
                          type: event.target
                            .value as UserProfile["dailyGoal"]["type"],
                        },
                      })
                    }
                  >
                    <option value="items">{t("settings.uniqueWords")}</option>
                    <option value="minutes">{t("settings.minutes")}</option>
                    <option value="attempts">{t("settings.attempts")}</option>
                  </select>
                </label>
                <label className="field">
                  <span>{t("settings.goalValue")}</span>
                  <input
                    type="number"
                    min="1"
                    max="100000"
                    step="1"
                    required
                    value={form.dailyGoal.value}
                    onChange={(event) =>
                      patch({
                        dailyGoal: {
                          ...form.dailyGoal,
                          value: Number(event.target.value),
                        },
                      })
                    }
                  />
                </label>
                <label className="field">
                  <span>{t("settings.newWordsPerDay")}</span>
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    step="1"
                    required
                    value={form.defaultNewItemsPerDay}
                    onChange={(event) =>
                      patch({
                        defaultNewItemsPerDay: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label className="field">
                  <span>{t("settings.translationMethod")}</span>
                  <select
                    value={form.translationMethodPreference || ""}
                    onChange={(event) =>
                      patch({
                        translationMethodPreference: (event.target.value ||
                          null) as UserProfile["translationMethodPreference"],
                      })
                    }
                  >
                    <option value="">{t("settings.noPreference")}</option>
                    <option value="auto">{t("settings.automatic")}</option>
                    <option value="dictionary">
                      {t("settings.dictionary")}
                    </option>
                    <option value="ai">AI</option>
                  </select>
                </label>
              </div>
              {mode === "live" && (
                <div className="field">
                  <span>{t("settings.enabledSkills")}</span>
                  <div className="live-options">
                    {(
                      [
                        "recognition",
                        "recall",
                        "listening",
                        "spelling",
                        "pronunciation",
                      ] as const
                    ).map((skill) => {
                      const enabled = form.learningPreferences
                        ?.enabledSkills || [
                        "recognition",
                        "recall",
                        "listening",
                        "spelling",
                        "pronunciation",
                      ];
                      return (
                        <label key={skill} className="live-checkbox">
                          <input
                            type="checkbox"
                            checked={enabled.includes(skill)}
                            onChange={(event) =>
                              patch({
                                learningPreferences: {
                                  enabledSkills: event.target.checked
                                    ? [...enabled, skill]
                                    : enabled.filter((s) => s !== skill),
                                },
                              })
                            }
                          />
                          {t(`labels.${skill}`)}
                        </label>
                      );
                    })}
                  </div>
                  <small className="muted-note">
                    {t("settings.skillsHelp")}
                  </small>
                </div>
              )}
              <div className="field interest-setting">
                <span>{t("settings.interests")}</span>
                <div className="interest-editor">
                  {form.interests.map((interest) => (
                    <span key={interest}>
                      {interest}
                      <button
                        type="button"
                        aria-label={t("settings.removeInterest", { interest })}
                        onClick={() =>
                          patch({
                            interests: form.interests.filter(
                              (value) => value !== interest,
                            ),
                          })
                        }
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="add-interest-row">
                <input
                  aria-label={t("settings.newInterest")}
                  value={newInterest}
                  maxLength={100}
                  onChange={(event) => setNewInterest(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addInterest();
                    }
                  }}
                  placeholder={t("settings.interestPlaceholder")}
                />
                <button
                  type="button"
                  className="button secondary"
                  disabled={!newInterest.trim() || form.interests.length >= 100}
                  onClick={addInterest}
                >
                  {t("settings.add")}
                </button>
              </div>
            </section>
          </fieldset>
          <div className="settings-card">
            <h2>{t("settings.remindersTitle")}</h2>
            <p className="muted-note">{t("settings.remindersDescription")}</p>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="settings-actions">
            {mode === "demo" && (
              <button
                type="button"
                className="button ghost danger-text"
                onClick={() => setResetOpen(true)}
              >
                <RotateCcw size={17} />
                {t("settings.resetDemoData")}
              </button>
            )}
            <button
              className="button primary"
              disabled={saving || !!profileError}
              type="submit"
            >
              {saving ? (
                <LoaderCircle className="spin" size={18} />
              ) : saved ? (
                <Check size={18} />
              ) : (
                <Save size={18} />
              )}
              {saving
                ? t("settings.saving")
                : saved
                  ? t("settings.saved")
                  : t("settings.saveChanges")}
            </button>
          </div>
          {saved && (
            <p className="sr-only" role="status">
              {t("settings.changesSaved")}
            </p>
          )}
        </div>
      </form>
      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title={t("settings.resetDemoTitle")}
      >
        <div className="modal-body">
          <p>{t("settings.resetDemoDescription")}</p>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => setResetOpen(false)}
            >
              {t("feedback.cancel")}
            </button>
            <button
              className="button primary"
              onClick={() => {
                resetDemo();
                setResetOpen(false);
                setSaved(false);
              }}
            >
              {t("settings.resetDemo")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
