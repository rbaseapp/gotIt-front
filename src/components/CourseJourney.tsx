import { BookOpen, Check, MessageCircle, Mic2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { lessonLink, type Course } from "../lib/courses";
type Unit = Course["versions"][number]["plan"]["units"][number];

export function CourseJourney({
  course,
  units,
  onWords,
}: {
  course: Course;
  units: Unit[];
  onWords: (unit: Unit) => void;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<{ course: string; key: string }>();
  const current =
    units.find(
      (unit) => selected?.course === course.id && unit.key === selected.key,
    ) ??
    units.find((unit) => unit.key === course.nextLesson?.unitKey) ??
    units.at(-1);
  const independentCount = (key: string) =>
    new Set(
      course.evidence
        .filter(
          (entry) =>
            entry.version === course.activeVersion &&
            entry.unitKey === key &&
            entry.independent,
        )
        .map((entry) => entry.lessonIndex),
    ).size;
  if (!current) return null;
  const completed = course.evidence.filter(
    (entry) =>
      entry.version === course.activeVersion &&
      entry.unitKey === current.key &&
      entry.covered,
  ).length;
  const journeyStart = Math.max(
    0,
    units.findIndex((unit) => unit.key === current.key) - 1,
  );
  const journeyUnits = units.slice(journeyStart, journeyStart + 4);
  return (
    <>
      <label className="field personal-map-mobile-selector">
        <span>{t("structuredUi.currentUnit")}</span>
        <select
          value={current.key}
          onChange={(event) =>
            setSelected({ course: course.id, key: event.target.value })
          }
        >
          {units.map((unit, index) => (
            <option key={unit.key} value={unit.key}>
              {t("englishPath.unit", { number: index + 1 })} · {unit.title}
            </option>
          ))}
        </select>
      </label>
      <div className="personal-map-mobile-links">
        <button
          className="button ghost"
          type="button"
          onClick={() => onWords(current)}
        >
          {t("ux.unitWords")}
        </button>
        <Link
          className="button ghost"
          to={`/history?course=${course.id}&view=lessons&language=${encodeURIComponent(course.preferences.targetLanguageCode)}`}
        >
          {t("ux.history")}
        </Link>
      </div>
      <section className="personal-unit-mobile ux-card">
        <h2>
          {t("englishPath.unit", { number: units.indexOf(current) + 1 })} ·{" "}
          {current.title}
        </h2>
        <p>{t("courses.nextLesson")}</p>
        <progress
          value={independentCount(current.key)}
          max={Math.max(current.lessons.length, 1)}
        />
        <article className="ux-card mint">
          <h3>
            <Mic2 size={24} />
            {t("accountUi.teacherMeeting")}
          </h3>
          <p dir="auto">{course.nextLesson?.title ?? current.outcome}</p>
          <p>
            {t("privateLesson.durationMinutes", {
              count: course.preferences.minutesPerLesson,
            })}{" "}
            · {t("accountUi.withHelp")}
          </p>
          {course.nextLesson?.unitKey === current.key && (
            <Link className="button primary" to={lessonLink(course)}>
              {t("structuredUi.withTeacher")}
            </Link>
          )}
        </article>
        <Link
          className="button ghost"
          to={`/history?course=${course.id}&view=lessons`}
        >
          {t("accountUi.completedActivities", { count: completed })}
        </Link>
        <h3>{t("structuredUi.inThisUnit")}</h3>
        <button
          className="button ghost"
          type="button"
          onClick={() => onWords(current)}
        >
          <BookOpen size={24} />
          {t("ux.unitWords")}
        </button>
      </section>
      <section className="personal-journey">
        <h2>{t("accountUi.whereInPlan")}</h2>
        <ol>
          {journeyUnits.map((unit, index) => {
            const done = independentCount(unit.key) >= unit.lessons.length;
            const active = current.key === unit.key;
            return (
              <li
                key={unit.key}
                className={done ? "completed" : active ? "current" : ""}
                aria-current={active ? "step" : undefined}
              >
                <span>
                  {done ? <Check /> : active ? <Mic2 /> : <MessageCircle />}
                </span>
                <strong dir="auto">{unit.title}</strong>
                <small>
                  {active
                    ? t("courses.youAreHere")
                    : String(journeyStart + index + 1)}
                </small>
              </li>
            );
          })}
        </ol>
      </section>
    </>
  );
}
