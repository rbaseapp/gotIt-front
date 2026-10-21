import { useState } from "react";
import { useTranslation } from "react-i18next";
import { lessonLink, type Course } from "../lib/courses";
import { LearningPathControls } from "./LearningPathControls";

export function CoursePathChoices({
  course,
  busy,
  onChoice,
}: {
  course: Course;
  busy: boolean;
  onChoice: (input: {
    version: number;
    unitKey: string;
    lessonIndex?: number;
    skipped: boolean;
  }) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState("");
  const version = course.versions.find(
    (item) => item.version === course.activeVersion,
  );
  const unit =
    version?.plan.units.find((item) => item.key === selected) ??
    version?.plan.units.find(
      (item) => item.key === course.nextLesson?.unitKey,
    ) ??
    version?.plan.units[0];
  if (!unit || !version) return null;
  return (
    <div className="course-path-choices">
      <label className="field">
        <span>{t("pathChoices.chooseUnit")}</span>
        <select
          value={unit.key}
          disabled={busy}
          onChange={(event) => setSelected(event.target.value)}
        >
          {version.plan.units.map((item) => (
            <option key={item.key} value={item.key}>
              {item.title}
            </option>
          ))}
        </select>
      </label>
      <LearningPathControls
        key={`${course.id}:${version.version}:${unit.key}`}
        title={unit.title}
        busy={busy}
        onChoice={(skipped, key) =>
          onChoice({
            version: version.version,
            unitKey: unit.key,
            ...(key === undefined ? {} : { lessonIndex: Number(key) }),
            skipped,
          })
        }
        items={unit.lessons.map((lesson, lessonIndex) => ({
          key: String(lessonIndex),
          title: lesson.title,
          complete: course.evidence.some(
            (e) =>
              e.unitKey === unit.key &&
              e.lessonIndex === lessonIndex &&
              e.independent,
          ),
          skipped: Boolean(
            course.skippedLessons?.some(
              (choice) =>
                choice.unitKey === unit.key &&
                choice.lessonIndex === lessonIndex,
            ),
          ),
          href: lessonLink(course, {
            version: version.version,
            unitKey: unit.key,
            lessonIndex,
          }),
          recommendation: unit.prerequisites.length
            ? t("pathChoices.prerequisite", {
                topics: unit.prerequisites
                  .map(
                    (key) =>
                      version.plan.units.find((item) => item.key === key)
                        ?.title ?? key,
                  )
                  .join(" · "),
              })
            : undefined,
        }))}
      />
    </div>
  );
}
