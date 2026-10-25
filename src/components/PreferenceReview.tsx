import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Pencil } from "lucide-react";
import type { Course, CoursePreferences } from "../lib/courses";
import { getBilingualLanguageOptions } from "../lib/languages";
import { LanguageCombobox } from "./LanguageCombobox";

type Field =
  | "targetLanguage"
  | "supportLanguage"
  | "goal"
  | "path"
  | "pace"
  | "experience"
  | "learningStyle"
  | "interests"
  | "youSaid"
  | "teacherSuggests";
const listFields = {
  interests: { key: "interests", count: 8, length: 100 },
  youSaid: { key: "statedNeeds", count: 8, length: 300 },
  teacherSuggests: { key: "recommendations", count: 6, length: 300 },
} as const;
const lines = (value: string) =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

export function PreferenceReview({
  course,
  disabled,
  readOnly = false,
  onSave,
  onEditingChange,
}: {
  course: Course;
  disabled: boolean;
  readOnly?: boolean;
  onSave: (preferences: CoursePreferences) => boolean | Promise<boolean>;
  onEditingChange?: (editing: boolean) => void;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<Field | null>(null);
  const [draft, setDraft] = useState(course.preferences);
  const [listText, setListText] = useState("");
  const form = useRef<HTMLFormElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const restoreFocus = useRef(false);
  const p = course.preferences;
  const targetLocked =
    course.versions.length > 0 ||
    course.activeVersion !== null ||
    course.evidence.length > 0;
  const languageOptions = getBilingualLanguageOptions();
  const languageName = (code: string) =>
    languageOptions.find(([value]) => value === code)?.[1] ?? code;

  // A conflict refresh discards the obsolete editor rather than resubmitting stale preferences.
  useEffect(() => {
    setEditing(null);
  }, [course.id, course.revision]);
  useEffect(() => {
    onEditingChange?.(editing !== null);
  }, [editing, onEditingChange]);
  useEffect(() => {
    if (editing) {
      form.current
        ?.querySelector<HTMLElement>("input, select, textarea")
        ?.focus();
    } else if (!disabled && restoreFocus.current) {
      trigger.current?.focus();
      restoreFocus.current = false;
    }
  }, [editing, disabled]);

  function update<K extends keyof CoursePreferences>(
    key: K,
    value: CoursePreferences[K],
  ) {
    setDraft((current) => ({
      ...current,
      [key]: value,
      ...(key === "startingLevel" && value !== "A1"
        ? { absoluteBeginner: false }
        : {}),
    }));
  }
  function select<
    K extends
      | "path"
      | "startingLevel"
      | "ageGroup"
      | "literacy"
      | "minutesPerLesson"
      | "daysPerWeek",
  >(
    key: K,
    label: string,
    options: readonly (readonly [CoursePreferences[K], string])[],
  ) {
    return (
      <label className="course-input-label">
        {label}
        <select
          value={draft[key]}
          onChange={(event) =>
            update(
              key,
              (typeof draft[key] === "number"
                ? Number(event.target.value)
                : event.target.value) as CoursePreferences[K],
            )
          }
        >
          {options.map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
      </label>
    );
  }
  function controls(field: Field) {
    if (field === "targetLanguage" || field === "supportLanguage") {
      const key =
        field === "targetLanguage"
          ? "targetLanguageCode"
          : "supportLanguageCode";
      return (
        <label className="course-input-label">
          {t(`courses.${field}`)}
          <LanguageCombobox
            value={draft[key]}
            onChange={(value) => update(key, value)}
            ariaLabel={t(`courses.${field}`)}
            required
            disabled={disabled}
          />
        </label>
      );
    }
    if (field === "goal" || field === "experience") {
      return (
        <>
          <label className="course-input-label">
            {t(`courses.${field}`)}
            <textarea
              required
              value={draft[field]}
              maxLength={500}
              dir="auto"
              onChange={(event) => update(field, event.target.value)}
            />
          </label>
          {field === "experience" && (
            <>
              {select(
                "startingLevel",
                t("courses.startingLevel"),
                (["A1", "A2", "B1", "B2", "C1", "C2"] as const).map(
                  (level) => [level, level] as const,
                ),
              )}
              <label className="course-preference-checkbox">
                <input
                  type="checkbox"
                  checked={draft.absoluteBeginner}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      absoluteBeginner: event.target.checked,
                      ...(event.target.checked ? { startingLevel: "A1" } : {}),
                    }))
                  }
                />
                {t("courses.absoluteBeginner")}
              </label>
            </>
          )}
        </>
      );
    }
    if (field === "path")
      return select(
        "path",
        t("courses.path"),
        (["comprehensive", "grammar", "goal"] as const).map(
          (value) => [value, t(`courses.paths.${value}`)] as const,
        ),
      );
    if (field === "pace")
      return (
        <div className="course-preference-controls">
          {select(
            "minutesPerLesson",
            t("courses.minutesPerLesson"),
            ([5, 10, 15] as const).map(
              (value) =>
                [value, t("courses.minuteCount", { count: value })] as const,
            ),
          )}
          {select(
            "daysPerWeek",
            t("courses.daysPerWeek"),
            [1, 2, 3, 4, 5, 6, 7].map(
              (value) => [value, String(value)] as const,
            ),
          )}
        </div>
      );
    if (field === "learningStyle")
      return (
        <div className="course-preference-controls">
          {select(
            "ageGroup",
            t("courses.ageGroup"),
            (["child", "teen", "adult", "unspecified"] as const).map(
              (value) => [value, t(`courses.age.${value}`)] as const,
            ),
          )}
          {select(
            "literacy",
            t("courses.readingComfort"),
            (
              ["not_yet", "developing", "independent", "unspecified"] as const
            ).map((value) => [value, t(`courses.literacy.${value}`)] as const),
          )}
        </div>
      );
    const limit = listFields[field];
    return (
      <label className="course-input-label">
        {t(`courses.${field}`)}
        <textarea
          value={listText}
          dir="auto"
          rows={4}
          maxLength={(limit.length + 1) * limit.count}
          onChange={(event) => {
            const value = event.target.value;
            setListText(value);
            event.target.setCustomValidity(
              lines(value).length > limit.count ||
                lines(value).some((line) => line.length > limit.length)
                ? t("courses.listLimit", {
                    count: limit.count,
                    length: limit.length,
                  })
                : "",
            );
          }}
        />
        <small>
          {t("courses.listLimit", { count: limit.count, length: limit.length })}
        </small>
      </label>
    );
  }
  function editButton(field: Field) {
    if (readOnly || (field === "targetLanguage" && targetLocked)) return null;
    return (
      <button
        type="button"
        className="course-icon-button"
        aria-label={
          field === "goal"
            ? t("courses.editGoal")
            : t("courses.editPreference", { field: t(`courses.${field}`) })
        }
        disabled={disabled || editing !== null}
        onClick={(event) => {
          trigger.current = event.currentTarget;
          restoreFocus.current = true;
          setDraft({ ...p });
          setListText(
            field in listFields
              ? p[listFields[field as keyof typeof listFields].key].join("\n")
              : "",
          );
          setEditing(field);
        }}
      >
        <Pencil size={15} aria-hidden="true" />
      </button>
    );
  }
  function editor(field: Field) {
    if (editing !== field) return null;
    return (
      <form
        ref={form}
        className="course-inline-edit"
        aria-label={t(`courses.${field}`)}
        onSubmit={async (event) => {
          event.preventDefault();
          if (disabled) return;
          const preferences = {
            ...draft,
            goal: draft.goal.trim(),
            experience: draft.experience.trim(),
          };
          if (!preferences.goal || !preferences.experience) return;
          if (field in listFields) {
            const limit = listFields[field as keyof typeof listFields];
            const values = lines(listText);
            if (
              values.length > limit.count ||
              values.some((value) => value.length > limit.length)
            )
              return;
            preferences[limit.key] = values;
          }
          if (await onSave(preferences)) setEditing(null);
        }}
        onKeyDown={(event) => {
          if (
            event.key === "Escape" &&
            !disabled &&
            event.target instanceof HTMLElement &&
            event.target.getAttribute("role") !== "combobox"
          ) {
            event.preventDefault();
            setEditing(null);
          }
        }}
      >
        <fieldset disabled={disabled}>
          {controls(field)}
          <div className="course-preference-actions">
            <button className="button secondary" type="submit">
              {t("courses.save")}
            </button>
            <button
              className="button ghost"
              type="button"
              onClick={() => setEditing(null)}
            >
              {t("feedback.cancel")}
            </button>
          </div>
        </fieldset>
      </form>
    );
  }
  function row(field: Field, value: ReactNode) {
    return (
      <div className="course-preference-row">
        <span>{t(`courses.${field}`)}</span>
        <strong dir="auto">{value || t("courses.notSpecified")}</strong>
        {editButton(field)}
        {editor(field)}
      </div>
    );
  }
  return (
    <>
      <div className="course-preferences">
        {row(
          "targetLanguage",
          <>
            {languageName(p.targetLanguageCode)}
            {!readOnly && targetLocked && (
              <small className="course-preference-hint">
                {t("courses.targetLanguageLocked")}
              </small>
            )}
          </>,
        )}
        {row("supportLanguage", languageName(p.supportLanguageCode))}
        {row("goal", p.goal)}
        {row("path", t(`courses.paths.${p.path}`))}
        {row(
          "pace",
          !readOnly && course.reportedAvailability
            ? course.reportedAvailability
            : t("courses.paceValue", {
                minutes: p.minutesPerLesson,
                days: p.daysPerWeek,
              }),
        )}
        {row(
          "experience",
          <>
            {p.experience}
            <small className="course-preference-hint">
              {t("courses.startingLevel")}: {p.startingLevel}
              {p.absoluteBeginner ? ` · ${t("courses.absoluteBeginner")}` : ""}
            </small>
          </>,
        )}
        {row(
          "learningStyle",
          `${t(`courses.age.${p.ageGroup}`)} · ${t(`courses.literacy.${p.literacy}`)}`,
        )}
        {(!readOnly || p.interests.length > 0) &&
          row("interests", p.interests.join(" · "))}
      </div>
      {(["youSaid", "teacherSuggests"] as const).map((field) => {
        const values = p[listFields[field].key];
        if (readOnly && !values.length) return null;
        return (
          <div className="course-preference-notes" key={field}>
            <div className="course-preference-notes-heading">
              <h3>{t(`courses.${field}`)}</h3>
              {editButton(field)}
            </div>
            {values.length ? (
              values.map((value, index) => (
                <p key={index} dir="auto">
                  {value}
                </p>
              ))
            ) : (
              <p>{t("courses.notSpecified")}</p>
            )}
            {editor(field)}
          </div>
        );
      })}
    </>
  );
}
