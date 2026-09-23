import { useEffect, useState, type FormEvent } from "react";
import {
  Check,
  Globe2,
  LoaderCircle,
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
import { getLanguageOptions } from "../lib/languages";
import { useTranslation } from "react-i18next";
import { UiLanguageSelect } from "../components/UiLanguageSelect";

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const languageOptions = getLanguageOptions(i18n.resolvedLanguage || "en");
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
  useEffect(() => {
    setForm(structuredClone(profile));
  }, [profile]);
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
      setSaved(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("settings.saveFailed"));
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
                      {mode === "live" ? t("settings.localTab") : t("settings.demo")}
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
                <select
                  value={form.defaultSourceLanguage || ""}
                  onChange={(event) =>
                    patch({
                      defaultSourceLanguage: event.target.value || null,
                    })
                  }
                >
                  <option value="">{t("settings.autoDetect")}</option>
                  {languageOptions.map(([code, label]) => (
                    <option value={code} key={code}>
                      {label} · {code}
                    </option>
                  ))}
                </select>
                <small className="muted-note">
                  {t("settings.autoDetectHelp")}
                </small>
              </label>
              <label className="field">
                <span>{t("settings.translationLanguage")}</span>
                <select
                  value={form.defaultTranslationLanguage || ""}
                  onChange={(event) =>
                    patch({
                      defaultTranslationLanguage: event.target.value || null,
                    })
                  }
                >
                  <option value="" disabled>{t("settings.chooseTranslationLanguage")}</option>
                  {languageOptions.map(([code, label]) => (
                    <option value={code} key={code}>
                      {label} · {code}
                    </option>
                  ))}
                </select>
                <small className="muted-note">
                  {t("settings.translationLanguageHelp")}
                </small>
              </label>
              <div className="language-editor">
                {form.languages.map((language, index) => (
                  <div className="language-editor-row" key={index}>
                    <label className="field">
                      <span>{t("settings.languageCode")}</span>
                      <input
                        aria-label={t("settings.languageNumber", { number: index + 1 })}
                        value={language.languageCode}
                        dir="ltr"
                        required
                        maxLength={64}
                        onChange={(event) =>
                          patch({
                            languages: form.languages.map((value, i) =>
                              i === index
                                ? { ...value, languageCode: event.target.value }
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
                          {t("settings.effectiveLevel", { level: language.effectiveLevel || "—" })} · {t("settings.systemLevel", { level: language.systemEstimatedLevel || "—" })}
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
              <p className="muted-note">
                {t("settings.levelHelp")}
              </p>
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
                    <option value="dictionary">{t("settings.dictionary")}</option>
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
            <p className="muted-note">
              {t("settings.remindersDescription")}
            </p>
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
              {saving ? t("settings.saving") : saved ? t("settings.saved") : t("settings.saveChanges")}
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
          <p>
            {t("settings.resetDemoDescription")}
          </p>
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
