import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Plus, X } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { LanguageCombobox } from "../LanguageCombobox";
import { getBilingualLanguageOptions } from "../../lib/languages";
import { SettingsSave } from "./SettingsControls";
import type { UserProfile } from "../../types";
export function SettingsLearning({ goals = false }: { goals?: boolean }) {
  const { t } = useTranslation();
  const { profile, updateProfile, profileError } = useApp();
  const [draft, setDraft] = useState(structuredClone(profile));
  const [editing, setEditing] = useState(false),
    [newLanguage, setNewLanguage] = useState(""),
    [interest, setInterest] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false),
    [error, setError] = useState("");
  const options = getBilingualLanguageOptions();
  const patch = (value: Partial<UserProfile>) => {
    setDraft((current) => ({ ...current, ...value }));
    setSaved(false);
  };
  const dirty = JSON.stringify(draft) !== JSON.stringify(profile);
  const names = new Map(options);
  function addInterest() {
    const value = interest.normalize("NFKC").replace(/\s+/gu, " ").trim();
    if (
      value &&
      !draft.interests.some((i) => i.toLowerCase() === value.toLowerCase())
    )
      patch({ interests: [...draft.interests, value] });
    setInterest("");
  }
  return (
    <form
      className="sd-editor"
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const changes = goals
          ? {
              dailyGoal: draft.dailyGoal,
              defaultNewItemsPerDay: draft.defaultNewItemsPerDay,
              learningPreferences: draft.learningPreferences,
            }
          : {
              languages: draft.languages,
              defaultSourceLanguage: draft.defaultSourceLanguage,
              defaultTranslationLanguage: draft.defaultTranslationLanguage,
              interests: draft.interests,
              learningPreferences: draft.learningPreferences,
            };
        void updateProfile(changes)
          .then(() => setSaved(true))
          .catch((e) => setError(String(e.message)))
          .finally(() => setBusy(false));
      }}
    >
      <fieldset disabled={busy || !!profileError} className="sd-fields">
        {goals ? (
          <>
            <section className="sd-card sd-two-columns">
              {(["daily", "new"] as const).map((kind) => (
                <div key={kind}>
                  <h2>
                    {t(
                      kind === "daily"
                        ? "settingsLive.dailyWords"
                        : "settings.newWordsPerDay",
                    )}
                  </h2>
                  <div className="sd-stepper">
                    <button
                      type="button"
                      aria-label={t("settingsLive.decrease")}
                      onClick={() =>
                        kind === "daily"
                          ? patch({
                              dailyGoal: {
                                type: draft.dailyGoal.type,
                                value: Math.max(1, draft.dailyGoal.value - 5),
                              },
                            })
                          : patch({
                              defaultNewItemsPerDay: Math.max(
                                0,
                                draft.defaultNewItemsPerDay - 1,
                              ),
                            })
                      }
                    >
                      −
                    </button>
                    <output>
                      {kind === "daily"
                        ? draft.dailyGoal.value
                        : draft.defaultNewItemsPerDay}
                    </output>
                    <button
                      type="button"
                      aria-label={t("settingsLive.increase")}
                      onClick={() =>
                        kind === "daily"
                          ? patch({
                              dailyGoal: {
                                type: draft.dailyGoal.type,
                                value: Math.min(
                                  100000,
                                  draft.dailyGoal.value + 5,
                                ),
                              },
                            })
                          : patch({
                              defaultNewItemsPerDay: Math.min(
                                10000,
                                draft.defaultNewItemsPerDay + 1,
                              ),
                            })
                      }
                    >
                      +
                    </button>
                  </div>
                  <p>
                    {t(
                      kind === "daily"
                        ? "settingsLive.dailyHelp"
                        : "settingsLive.newHelp",
                    )}
                  </p>
                </div>
              ))}
              <label className="field">
                <span>{t("settings.goalType")}</span>
                <select
                  value={draft.dailyGoal.type}
                  onChange={(e) =>
                    patch({
                      dailyGoal: {
                        ...draft.dailyGoal,
                        type: e.currentTarget
                          .value as UserProfile["dailyGoal"]["type"],
                      },
                    })
                  }
                >
                  {["items", "minutes", "attempts"].map((type) => (
                    <option key={type} value={type}>
                      {t(
                        type === "items"
                          ? "settings.uniqueWords"
                          : `settings.${type}`,
                      )}
                    </option>
                  ))}
                </select>
              </label>
            </section>
            <section className="sd-card">
              <h2>{t("settingsLive.practiceFocus")}</h2>
              <div className="sd-tiles">
                {(
                  [
                    "recognition",
                    "recall",
                    "listening",
                    "spelling",
                    "pronunciation",
                  ] as const
                ).map((skill) => {
                  const skills = draft.learningPreferences?.enabledSkills ?? [
                    "recognition",
                    "recall",
                    "listening",
                    "spelling",
                    "pronunciation",
                  ];
                  return (
                    <button
                      type="button"
                      key={skill}
                      aria-pressed={skills.includes(skill)}
                      onClick={() =>
                        patch({
                          learningPreferences: {
                            ...draft.learningPreferences,
                            enabledSkills: skills.includes(skill)
                              ? skills.length > 1
                                ? skills.filter((s) => s !== skill)
                                : skills
                              : [...skills, skill],
                          },
                        })
                      }
                    >
                      {t(`labels.${skill}`)}
                    </button>
                  );
                })}
              </div>
              <p>{t("settingsLive.practiceFocusHelp")}</p>
            </section>
          </>
        ) : (
          <>
            <section className="sd-card">
              <div className="sd-setting-row">
                <div>
                  <h2>{t("settingsLive.learningLanguages")}</h2>
                  <p>{t("settingsLive.languageEditHelp")}</p>
                </div>
                <button
                  type="button"
                  className="sd-icon-button"
                  aria-label={t("settingsLive.editLanguages")}
                  onClick={() => setEditing((v) => !v)}
                >
                  <Pencil size={18} />
                </button>
              </div>
              <fieldset className="sd-fields" disabled={!editing}>
                {draft.languages.map((language, index) => (
                  <div className="sd-language-row" key={language.languageCode}>
                    <strong>
                      {names.get(language.languageCode) ||
                        language.languageCode}
                    </strong>
                    <button
                      className="sd-outline"
                      type="button"
                      disabled={draft.languages.length < 2}
                      onClick={() =>
                        patch({
                          languages: draft.languages.filter(
                            (_, i) => i !== index,
                          ),
                        })
                      }
                    >
                      {t("common.remove")}
                    </button>
                    <div
                      className="sd-levels"
                      role="group"
                      aria-label={`${t("settingsLive.startLevel")} — ${language.languageCode}`}
                    >
                      {(["A1", "A2", "B1", "B2", "C1", "C2"] as const).map(
                        (level) => (
                          <button
                            type="button"
                            key={level}
                            aria-pressed={language.selfAssessedLevel === level}
                            onClick={() =>
                              patch({
                                languages: draft.languages.map((item, i) =>
                                  i === index
                                    ? { ...item, selfAssessedLevel: level }
                                    : item,
                                ),
                              })
                            }
                          >
                            {level}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                ))}
                <div className="sd-add-row">
                  <LanguageCombobox
                    ariaLabel={t("settingsLive.addLanguage")}
                    value={newLanguage}
                    onChange={setNewLanguage}
                    options={options.filter(
                      ([code]) =>
                        !draft.languages.some((l) => l.languageCode === code),
                    )}
                  />
                  <button
                    className="sd-outline"
                    type="button"
                    disabled={!newLanguage}
                    onClick={() => {
                      patch({
                        languages: [
                          ...draft.languages,
                          {
                            languageCode: newLanguage,
                            selfAssessedLevel: "A1",
                          },
                        ],
                      });
                      setNewLanguage("");
                    }}
                  >
                    <Plus size={18} />
                    {t("common.add")}
                  </button>
                </div>
              </fieldset>
            </section>
            <section className="sd-card">
              <h2>{t("settingsLive.explanationLanguages")}</h2>
              <div className="sd-two-columns">
                <div className="field">
                  <span>{t("settings.sourceLanguage")}</span>
                  <LanguageCombobox
                    ariaLabel={t("settings.sourceLanguage")}
                    value={draft.defaultSourceLanguage ?? ""}
                    onChange={(value) =>
                      patch({ defaultSourceLanguage: value || null })
                    }
                    options={options}
                  />
                </div>
                <div className="field">
                  <span>{t("settings.translationLanguage")}</span>
                  <LanguageCombobox
                    ariaLabel={t("settings.translationLanguage")}
                    value={draft.defaultTranslationLanguage ?? ""}
                    onChange={(value) =>
                      patch({ defaultTranslationLanguage: value || null })
                    }
                    options={options}
                  />
                </div>
              </div>
              <h2>{t("language.label")}</h2>
              <div className="sd-tiles">
                {options
                  .filter(([code]) =>
                    ["he", "en", "ar", "es", "fr", "de", "ru", "zh"].includes(
                      code,
                    ),
                  )
                  .concat([["zh", "Chinese — 中文"]])
                  .map(([code, name]) => (
                    <button
                      type="button"
                      key={code}
                      aria-pressed={
                        draft.learningPreferences?.uiLocale === code
                      }
                      onClick={() =>
                        patch({
                          learningPreferences: {
                            enabledSkills: draft.learningPreferences
                              ?.enabledSkills ?? [
                              "recognition",
                              "recall",
                              "listening",
                              "spelling",
                              "pronunciation",
                            ],
                            ...draft.learningPreferences,
                            uiLocale: code as NonNullable<
                              UserProfile["learningPreferences"]
                            >["uiLocale"],
                          },
                        })
                      }
                    >
                      <b>{code.toUpperCase()}</b>
                      {name}
                    </button>
                  ))}
              </div>
            </section>
            <section className="sd-card">
              <h2>{t("settings.interests")}</h2>
              <div className="sd-add-row">
                <input
                  aria-label={t("settings.interests")}
                  value={interest}
                  maxLength={100}
                  onChange={(e) => setInterest(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addInterest();
                    }
                  }}
                />
                <button
                  type="button"
                  className="sd-icon-button"
                  aria-label={t("common.add")}
                  onClick={addInterest}
                >
                  <Plus />
                </button>
              </div>
              <div className="sd-chips">
                {draft.interests.map((value) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() =>
                      patch({
                        interests: draft.interests.filter((i) => i !== value),
                      })
                    }
                  >
                    {value}
                    <X size={16} />
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </fieldset>
      <SettingsSave
        dirty={dirty}
        busy={busy || !!profileError}
        error={error || profileError || ""}
        saved={saved}
        onCancel={() => setDraft(structuredClone(profile))}
      />
    </form>
  );
}
